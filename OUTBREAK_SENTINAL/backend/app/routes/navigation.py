from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.core.supabase_rest import first_or_none, supabase_rest
from app.schemas.navigation import (
    GenerateRouteRequest,
    NavigationRouteResponse,
    RerouteRequest,
    RouteEnvelopeResponse,
)
from app.services.mapbox_service import compute_eta_timestamp, fetch_directions
from app.services.websocket_manager import vehicle_ws_manager


router = APIRouter(prefix="/navigation", tags=["Navigation"])


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


@router.post("/generate-route", response_model=RouteEnvelopeResponse, status_code=status.HTTP_201_CREATED)
async def generate_route(payload: GenerateRouteRequest) -> RouteEnvelopeResponse:
    v_rows = await supabase_rest.get("medical_vehicles", params={"select": "*", "id": f"eq.{payload.vehicle_id}"})
    vehicle = first_or_none(v_rows)
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    if payload.origin is None:
        if vehicle.get("current_latitude") is None or vehicle.get("current_longitude") is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Origin not provided and vehicle location missing")
        origin_lat = float(vehicle["current_latitude"])
        origin_lng = float(vehicle["current_longitude"])
    else:
        origin_lat = payload.origin.lat
        origin_lng = payload.origin.lng

    options = await fetch_directions(
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        destination_lat=payload.destination.lat,
        destination_lng=payload.destination.lng,
        alternatives=payload.alternatives,
    )
    scored = []
    for idx, opt in enumerate(options):
        scored.append((idx, _score(opt.duration_minutes, opt.distance_km, opt.traffic_level), opt))
    scored.sort(key=lambda t: t[1])
    selected_idx, _, selected = scored[0]

    await supabase_rest.patch(
        "navigation_routes",
        params={"vehicle_id": f"eq.{payload.vehicle_id}", "route_status": "eq.active"},
        json={"route_status": "completed"},
    )

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

    inserted = await supabase_rest.post(
        "navigation_routes",
        json={
            "vehicle_id": str(payload.vehicle_id),
            "origin_lat": origin_lat,
            "origin_lng": origin_lng,
            "destination_lat": payload.destination.lat,
            "destination_lng": payload.destination.lng,
            "route_geometry": selected.geometry,
            "distance_km": selected.distance_km,
            "duration_minutes": selected.duration_minutes,
            "alternative_routes_json": alt,
            "selected_route_index": int(selected_idx),
            "traffic_level": selected.traffic_level,
            "eta_timestamp": compute_eta_timestamp(selected.duration_minutes).isoformat(),
            "route_status": "active",
        },
    )
    route = first_or_none(inserted)
    if route is None:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to store route")

    await vehicle_ws_manager.broadcast(
        payload.vehicle_id,
        {
            "type": "navigation.route_generated",
            "vehicle_id": str(payload.vehicle_id),
            "route_id": str(route.get("id")),
            "eta_timestamp": route.get("eta_timestamp"),
            "distance_km": route.get("distance_km"),
            "duration_minutes": route.get("duration_minutes"),
            "route_geometry": route.get("route_geometry"),
            "alternative_routes": route.get("alternative_routes_json"),
        },
    )

    return RouteEnvelopeResponse(active_route=NavigationRouteResponse.model_validate(route))


@router.get("/active-route/{vehicle_id}", response_model=RouteEnvelopeResponse)
async def active_route(vehicle_id: str) -> RouteEnvelopeResponse:
    try:
        from uuid import UUID

        vehicle_uuid = UUID(vehicle_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid vehicle_id")

    rows = await supabase_rest.get(
        "navigation_routes",
        params={"select": "*", "vehicle_id": f"eq.{vehicle_uuid}", "route_status": "eq.active", "order": "created_at.desc", "limit": "1"},
    )
    route = first_or_none(rows)
    if route is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active route")
    return RouteEnvelopeResponse(active_route=NavigationRouteResponse.model_validate(route))


@router.post("/reroute", response_model=RouteEnvelopeResponse)
async def reroute(payload: RerouteRequest) -> RouteEnvelopeResponse:
    rows = await supabase_rest.get(
        "navigation_routes",
        params={"select": "*", "vehicle_id": f"eq.{payload.vehicle_id}", "route_status": "eq.active", "order": "created_at.desc", "limit": "1"},
    )
    route = first_or_none(rows)
    if route is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active route")

    v_rows = await supabase_rest.get("medical_vehicles", params={"select": "*", "id": f"eq.{payload.vehicle_id}"})
    vehicle = first_or_none(v_rows)
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    if vehicle.get("current_latitude") is None or vehicle.get("current_longitude") is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vehicle location missing")

    options = await fetch_directions(
        origin_lat=float(vehicle["current_latitude"]),
        origin_lng=float(vehicle["current_longitude"]),
        destination_lat=float(route["destination_lat"]),
        destination_lng=float(route["destination_lng"]),
        alternatives=True,
    )
    scored = []
    for idx, opt in enumerate(options):
        scored.append((idx, _score(opt.duration_minutes, opt.distance_km, opt.traffic_level), opt))
    scored.sort(key=lambda t: t[1])
    selected_idx, _, selected = scored[0]

    current = float(route.get("duration_minutes") or 0.0)
    new = float(selected.duration_minutes)
    improvement = 1.0 if current <= 0 else (current - new) / current
    updated_flag = improvement >= settings.reroute_improvement_threshold
    if updated_flag:
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
        patched = await supabase_rest.patch(
            "navigation_routes",
            params={"id": f"eq.{route['id']}"},
            json={
                "origin_lat": float(vehicle["current_latitude"]),
                "origin_lng": float(vehicle["current_longitude"]),
                "route_geometry": selected.geometry,
                "distance_km": selected.distance_km,
                "duration_minutes": selected.duration_minutes,
                "alternative_routes_json": alt,
                "selected_route_index": int(selected_idx),
                "traffic_level": selected.traffic_level,
                "eta_timestamp": compute_eta_timestamp(selected.duration_minutes).isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            },
        )
        route = first_or_none(patched) or route

    await vehicle_ws_manager.broadcast(
        payload.vehicle_id,
        {
            "type": "navigation.route_updated" if updated_flag else "navigation.route_unchanged",
            "vehicle_id": str(payload.vehicle_id),
            "route_id": str(route.get("id")),
            "eta_timestamp": route.get("eta_timestamp"),
            "distance_km": route.get("distance_km"),
            "duration_minutes": route.get("duration_minutes"),
            "route_geometry": route.get("route_geometry"),
            "alternative_routes": route.get("alternative_routes_json"),
        },
    )

    return RouteEnvelopeResponse(active_route=NavigationRouteResponse.model_validate(route))
