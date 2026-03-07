from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.medical_vehicle import AssignmentStatus
from app.schemas.doctor_dashboard import OutbreakResponse
from app.schemas.navigation import NavigationRouteResponse


class VehicleAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    vehicle_id: UUID
    outbreak_id: UUID
    assigned_by: UUID
    assignment_status: AssignmentStatus
    assigned_at: datetime
    accepted_at: Optional[datetime]


class VehicleAssignmentDetailedResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    vehicle_id: UUID
    outbreak_id: UUID
    assigned_by: UUID
    assignment_status: AssignmentStatus
    assigned_at: datetime
    accepted_at: Optional[datetime]
    outbreak: Optional[OutbreakResponse] = None


class AssignmentAcceptRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"assignment_id": "b9e3b8a5-1bf1-4e4c-a2c6-24b2c146e7fe"}})

    assignment_id: UUID = Field(...)


class AssignmentRejectRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={"example": {"assignment_id": "b9e3b8a5-1bf1-4e4c-a2c6-24b2c146e7fe", "reason": "Vehicle unavailable"}}
    )

    assignment_id: UUID
    reason: Optional[str] = Field(default=None, max_length=250)


class AssignmentCreateRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "outbreak_id": "b9e3b8a5-1bf1-4e4c-a2c6-24b2c146e7fe",
                "vehicle_id": "5c0a8d47-2a05-4b30-a690-1c31e25a2c1b",
                "assigned_by": "00000000-0000-0000-0000-000000000000",
            }
        }
    )

    outbreak_id: UUID
    vehicle_id: Optional[UUID] = None
    assigned_by: UUID = Field(default=UUID("00000000-0000-0000-0000-000000000000"))


class VehicleAssignmentWithRouteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    assignment: VehicleAssignmentResponse
    route: Optional[NavigationRouteResponse] = None
