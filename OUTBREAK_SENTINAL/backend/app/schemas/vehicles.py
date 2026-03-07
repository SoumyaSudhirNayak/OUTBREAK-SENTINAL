from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.medical_vehicle import VehicleStatus


class VehicleRegisterRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"vehicle_name": "Van-12", "driver_name": "Ravi", "contact_number": "+91-9000000000"}})

    vehicle_name: str = Field(min_length=1, max_length=120)
    driver_name: str = Field(min_length=1, max_length=120)
    contact_number: str = Field(min_length=3, max_length=32)
    fuel_level_percentage: Optional[int] = Field(default=None, ge=0, le=100)
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None


class VehicleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    vehicle_name: str
    driver_name: str
    contact_number: str
    current_latitude: Optional[float]
    current_longitude: Optional[float]
    fuel_level_percentage: Optional[int]
    vehicle_status: VehicleStatus
    created_at: datetime
    updated_at: datetime


class VehicleUpdateLocationRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {"vehicle_id": "5c0a8d47-2a05-4b30-a690-1c31e25a2c1b", "latitude": 19.0760, "longitude": 72.8777, "speed": 31.4}
        }
    )

    vehicle_id: UUID
    latitude: float
    longitude: float
    speed: Optional[float] = None


class VehicleUpdateStatusRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"vehicle_id": "5c0a8d47-2a05-4b30-a690-1c31e25a2c1b", "vehicle_status": "on_route"}})

    vehicle_id: UUID
    vehicle_status: VehicleStatus
