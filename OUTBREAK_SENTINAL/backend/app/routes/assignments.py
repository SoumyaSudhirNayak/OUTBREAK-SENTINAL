from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.core.supabase_rest import first_or_none, supabase_rest
from app.models.medical_vehicle import VehicleStatus
from app.core.config import settings
from app.schemas.assignments import (
    AssignmentAcceptRequest,
    AssignmentCreateRequest,
    AssignmentRejectRequest,
    VehicleAssignmentDetailedResponse,
    VehicleAssignmentResponse,
    VehicleAssignmentWithRouteResponse,
)
from app.schemas.navigation import NavigationRouteResponse
from app.services.mapbox_service import compute_eta_timestamp, fetch_directions
from app.services.websocket_manager import vehicle_ws_manager


router = APIRouter(prefix="/vehicle", tags=["Vehicle Assignments"])


def _traffic_penalty(level: str | None) -> float:
    if level == "low" or level is None:
        return 0.0
    if level == "medium":
        return 2.0
    if level == "high":
        return 6.0
    return 2.0


def _score(duration_minutes: float, distance_km: float, traffic_level: str | None) -> float:
    return duration_minutes + settings.route_distance_weight * distance_km + _traffic_penalty(traffic_level)


@router.get("/assignments/{vehicle_id}", response_model=list[VehicleAssignmentResponse])
async def list_assignments(vehicle_id: UUID) -> list[VehicleAssignmentResponse]:
    rows = await supabase_rest.get(
        "vehicle_assignments",
        params={"select": "*", "vehicle_id": f"eq.{vehicle_id}", "order": "assigned_at.desc"},
    )
    return [VehicleAssignmentResponse.model_validate(r) for r in (rows or [])]


@router.get("/assignments/{vehicle_id}/detailed", response_model=list[VehicleAssignmentDetailedResponse])
async def list_assignments_detailed(vehicle_id: UUID) -> list[VehicleAssignmentDetailedResponse]:
    rows = await supabase_rest.get(
        "vehicle_assignments",
        params={
            "select": "*,outbreak:outbreaks(*)",
            "vehicle_id": f"eq.{vehicle_id}",
            "order": "assigned_at.desc",
        },
    )
    return [VehicleAssignmentDetailedResponse.model_validate(r) for r in (rows or [])]


@router.post("/assignments", response_model=VehicleAssignmentWithRouteResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment(payload: AssignmentCreateRequest) -> VehicleAssignmentWithRouteResponse:
    o_rows = await supabase_rest.get("outbreaks", params={"select": "id,latitude,longitude", "id": f"eq.{payload.outbreak_id}"})
    outbreak = first_or_none(o_rows)
    if outbreak is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outbreak not found")

    dest_lat = float(outbreak["latitude"])
    dest_lng = float(outbreak["longitude"])

    busy_rows = await supabase_rest.get(
        "vehicle_assignments",
        params={"select": "vehicle_id", "assignment_status": "in.(pending,accepted)"},
    )
    busy_vehicle_ids = {str(r.get("vehicle_id")) for r in (busy_rows or []) if r.get("vehicle_id")}

    vehicles = await supabase_rest.get(
        "medical_vehicles",
        params={
            "select": "id,vehicle_status,current_latitude,current_longitude,updated_at",
            "order": "updated_at.desc",
            "limit": "2000",
        },
    )
    all_vehicles = vehicles or []
    available = [v for v in all_vehicles if str(v.get("id")) and str(v.get("id")) not in busy_vehicle_ids]

    if payload.vehicle_id is not None:
        chosen = next((v for v in available if str(v.get("id")) == str(payload.vehicle_id)), None)
        if chosen is None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Requested vehicle is not available")
        chosen_vehicle = chosen
        chosen_option = None
        chosen_alt_payload = None
        chosen_idx = 0
    else:
        chosen_vehicle = None
        chosen_option = None
        chosen_alt_payload = None
        chosen_idx = 0

        candidates = available if available else all_vehicles
        if not candidates:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No vehicles registered")

        best = None
        for v in candidates:
            if v.get("current_latitude") is None or v.get("current_longitude") is None:
                continue

            origin_lat = float(v["current_latitude"])
            origin_lng = float(v["current_longitude"])

            try:
                options = await fetch_directions(
                    origin_lat=origin_lat,
                    origin_lng=origin_lng,
                    destination_lat=dest_lat,
                    destination_lng=dest_lng,
                    alternatives=True,
                )
            except Exception:
                continue

            scored: list[tuple[int, float]] = []
            for idx, opt in enumerate(options):
                scored.append((idx, _score(opt.duration_minutes, opt.distance_km, opt.traffic_level)))
            scored.sort(key=lambda t: t[1])
            idx0, score0 = scored[0]

            if best is None or score0 < best[0]:
                alt = {
                    "routes": [
                        {
                            "geometry": o.geometry,
                            "distance_km": o.distance_km,
                            "duration_minutes": o.duration_minutes,
                            "traffic_level": o.traffic_level,
                            "score": _score(o.duration_minutes, o.distance_km, o.traffic_level),
                        }
                        for o in options
                    ]
                }
                best = (score0, v, options[idx0], alt, int(idx0))

        if best is not None:
            _, chosen_vehicle, chosen_option, chosen_alt_payload, chosen_idx = best
        else:
            chosen_vehicle = candidates[0]

        if not available:
            await supabase_rest.patch(
                "vehicle_assignments",
                params={"vehicle_id": f"eq.{chosen_vehicle['id']}", "assignment_status": "in.(pending,accepted)"},
                json={"assignment_status": "completed"},
            )

            await supabase_rest.patch(
                "navigation_routes",
                params={"vehicle_id": f"eq.{chosen_vehicle['id']}", "route_status": "eq.active"},
                json={"route_status": "completed"},
            )

    assignment_rows = await supabase_rest.post(
        "vehicle_assignments",
        json={
            "vehicle_id": str(chosen_vehicle["id"]),
            "outbreak_id": str(payload.outbreak_id),
            "assigned_by": str(payload.assigned_by),
            "assignment_status": "pending",
        },
    )
    assignment = first_or_none(assignment_rows)
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to create assignment")

    await supabase_rest.patch(
        "medical_vehicles",
        params={"id": f"eq.{chosen_vehicle['id']}"},
        json={"vehicle_status": VehicleStatus.assigned.value},
    )

    await vehicle_ws_manager.broadcast(
        UUID(str(chosen_vehicle["id"])),
        {
            "type": "assignment.new",
            "vehicle_id": str(chosen_vehicle["id"]),
            "assignment_id": str(assignment.get("id")),
            "outbreak_id": str(payload.outbreak_id),
            "assignment_status": assignment.get("assignment_status", "pending"),
        },
    )

    route_model = None
    if chosen_option is not None and chosen_vehicle.get("current_latitude") is not None and chosen_vehicle.get("current_longitude") is not None:
        await supabase_rest.patch(
            "navigation_routes",
            params={"vehicle_id": f"eq.{chosen_vehicle['id']}", "route_status": "eq.active"},
            json={"route_status": "completed"},
        )

        origin_lat = float(chosen_vehicle["current_latitude"])
        origin_lng = float(chosen_vehicle["current_longitude"])

        inserted = await supabase_rest.post(
            "navigation_routes",
            json={
                "vehicle_id": str(chosen_vehicle["id"]),
                "origin_lat": origin_lat,
                "origin_lng": origin_lng,
                "destination_lat": dest_lat,
                "destination_lng": dest_lng,
                "route_geometry": chosen_option.geometry,
                "distance_km": chosen_option.distance_km,
                "duration_minutes": chosen_option.duration_minutes,
                "alternative_routes_json": chosen_alt_payload,
                "selected_route_index": int(chosen_idx),
                "traffic_level": chosen_option.traffic_level,
                "eta_timestamp": compute_eta_timestamp(chosen_option.duration_minutes).isoformat(),
                "route_status": "active",
            },
        )
        route = first_or_none(inserted)
        if route is not None:
            route_model = NavigationRouteResponse.model_validate(route)
            await vehicle_ws_manager.broadcast(
                UUID(str(chosen_vehicle["id"])),
                {
                    "type": "navigation.route_generated",
                    "vehicle_id": str(chosen_vehicle["id"]),
                    "route_id": str(route.get("id")),
                    "eta_timestamp": route.get("eta_timestamp"),
                    "distance_km": route.get("distance_km"),
                    "duration_minutes": route.get("duration_minutes"),
                    "route_geometry": route.get("route_geometry"),
                    "alternative_routes": route.get("alternative_routes_json"),
                },
            )

    return VehicleAssignmentWithRouteResponse(
        assignment=VehicleAssignmentResponse.model_validate(assignment),
        route=route_model,
    )


@router.post("/assignment/accept", response_model=VehicleAssignmentResponse)
async def accept_assignment(payload: AssignmentAcceptRequest) -> VehicleAssignmentResponse:
    rows = await supabase_rest.get("vehicle_assignments", params={"select": "*", "id": f"eq.{payload.assignment_id}"})
    assignment = first_or_none(rows)
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    updated = await supabase_rest.patch(
        "vehicle_assignments",
        params={"id": f"eq.{payload.assignment_id}"},
        json={"assignment_status": "accepted", "accepted_at": datetime.now(tz=timezone.utc).isoformat()},
    )
    assignment2 = first_or_none(updated)
    if assignment2 is None:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to accept assignment")

    vehicle_id = assignment2.get("vehicle_id")
    if vehicle_id:
        v_rows = await supabase_rest.get("medical_vehicles", params={"select": "id,vehicle_status", "id": f"eq.{vehicle_id}"})
        vehicle = first_or_none(v_rows)
        if vehicle is not None and vehicle.get("vehicle_status") == VehicleStatus.idle.value:
            await supabase_rest.patch(
                "medical_vehicles",
                params={"id": f"eq.{vehicle_id}"},
                json={"vehicle_status": VehicleStatus.assigned.value},
            )

        await vehicle_ws_manager.broadcast(
            UUID(str(vehicle_id)),
            {"type": "assignment.updated", "vehicle_id": str(vehicle_id), "assignment_id": str(assignment2.get("id")), "assignment_status": "accepted"},
        )

    return VehicleAssignmentResponse.model_validate(assignment2)


@router.post("/assignment/reject", response_model=VehicleAssignmentResponse)
async def reject_assignment(payload: AssignmentRejectRequest) -> VehicleAssignmentResponse:
    rows = await supabase_rest.get("vehicle_assignments", params={"select": "*", "id": f"eq.{payload.assignment_id}"})
    assignment = first_or_none(rows)
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    updated = await supabase_rest.patch(
        "vehicle_assignments",
        params={"id": f"eq.{payload.assignment_id}"},
        json={"assignment_status": "rejected"},
    )
    assignment2 = first_or_none(updated)
    if assignment2 is None:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to reject assignment")

    vehicle_id = assignment2.get("vehicle_id")
    if vehicle_id:
        await supabase_rest.patch(
            "medical_vehicles",
            params={"id": f"eq.{vehicle_id}"},
            json={"vehicle_status": VehicleStatus.idle.value},
        )

        await supabase_rest.patch(
            "navigation_routes",
            params={"vehicle_id": f"eq.{vehicle_id}", "route_status": "eq.active"},
            json={"route_status": "completed"},
        )

        await vehicle_ws_manager.broadcast(
            UUID(str(vehicle_id)),
            {
                "type": "assignment.updated",
                "vehicle_id": str(vehicle_id),
                "assignment_id": str(assignment2.get("id")),
                "assignment_status": "rejected",
                "reason": payload.reason,
            },
        )

    return VehicleAssignmentResponse.model_validate(assignment2)
