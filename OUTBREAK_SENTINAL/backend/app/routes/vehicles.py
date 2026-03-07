from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.core.supabase_rest import first_or_none, supabase_rest
from app.models.medical_vehicle import VehicleStatus
from app.schemas.vehicles import (
    VehicleRegisterRequest,
    VehicleResponse,
    VehicleUpdateLocationRequest,
    VehicleUpdateStatusRequest,
)
from app.services.websocket_manager import vehicle_ws_manager


router = APIRouter(prefix="/vehicles", tags=["Medical Vehicles"])


@router.get("/", response_model=list[VehicleResponse])
async def list_vehicles(limit: int = 500) -> list[VehicleResponse]:
    limit = min(max(limit, 1), 2000)
    rows = await supabase_rest.get("medical_vehicles", params={"select": "*", "order": "created_at.desc", "limit": str(limit)})
    return [VehicleResponse.model_validate(r) for r in (rows or [])]


@router.post("/register", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def register_vehicle(payload: VehicleRegisterRequest) -> VehicleResponse:
    rows = await supabase_rest.post(
        "medical_vehicles",
        json={
            "vehicle_name": payload.vehicle_name,
            "driver_name": payload.driver_name,
            "contact_number": payload.contact_number,
            "current_latitude": payload.current_latitude,
            "current_longitude": payload.current_longitude,
            "fuel_level_percentage": payload.fuel_level_percentage,
            "vehicle_status": VehicleStatus.idle.value,
        },
    )
    row = first_or_none(rows)
    if row is None:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to register vehicle")
    return VehicleResponse.model_validate(row)


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(vehicle_id: UUID) -> VehicleResponse:
    rows = await supabase_rest.get("medical_vehicles", params={"select": "*", "id": f"eq.{vehicle_id}"})
    row = first_or_none(rows)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return VehicleResponse.model_validate(row)


@router.patch("/update-location", response_model=VehicleResponse)
async def update_location(payload: VehicleUpdateLocationRequest) -> VehicleResponse:
    updated = await supabase_rest.patch(
        "medical_vehicles",
        params={"id": f"eq.{payload.vehicle_id}"},
        json={"current_latitude": payload.latitude, "current_longitude": payload.longitude},
    )
    vehicle = first_or_none(updated)
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    await supabase_rest.post(
        "vehicle_location_logs",
        json={
            "vehicle_id": str(payload.vehicle_id),
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "speed": payload.speed,
        },
    )

    await vehicle_ws_manager.broadcast(
        payload.vehicle_id,
        {
            "type": "vehicle.location_updated",
            "vehicle_id": str(payload.vehicle_id),
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "speed": payload.speed,
        },
    )

    return VehicleResponse.model_validate(vehicle)


@router.patch("/status", response_model=VehicleResponse)
async def update_status(payload: VehicleUpdateStatusRequest) -> VehicleResponse:
    updated = await supabase_rest.patch(
        "medical_vehicles",
        params={"id": f"eq.{payload.vehicle_id}"},
        json={"vehicle_status": payload.vehicle_status.value},
    )
    vehicle = first_or_none(updated)
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    await vehicle_ws_manager.broadcast(
        payload.vehicle_id,
        {
            "type": "vehicle.status_updated",
            "vehicle_id": str(payload.vehicle_id),
            "vehicle_status": payload.vehicle_status.value,
        },
    )
    return VehicleResponse.model_validate(vehicle)


@router.get("/{vehicle_id}/location-logs")
async def get_location_logs(vehicle_id: UUID, limit: int = 200) -> list[dict]:
    limit = min(max(limit, 1), 2000)
    rows = await supabase_rest.get(
        "vehicle_location_logs",
        params={"select": "*", "vehicle_id": f"eq.{vehicle_id}", "order": "timestamp.desc", "limit": str(limit)},
    )
    return rows or []
