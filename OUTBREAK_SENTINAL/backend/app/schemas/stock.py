from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class VehicleStockUpdateRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "vehicle_id": "5c0a8d47-2a05-4b30-a690-1c31e25a2c1b",
                "medicine_name": "Paracetamol",
                "quantity_used": 12,
                "equipment_used": {"oxygen_units": 1},
                "patients_treated": 4,
            }
        }
    )

    vehicle_id: UUID
    outbreak_id: Optional[UUID] = None
    medicine_name: str = Field(min_length=1, max_length=120)
    quantity_used: int = Field(ge=0, default=0)
    equipment_used: Optional[dict[str, Any]] = None
    patients_treated: int = Field(ge=0, default=0)


class VehicleStockUsageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    vehicle_id: UUID
    outbreak_id: Optional[UUID] = None
    medicine_name: str
    quantity_used: int
    equipment_used: Optional[dict[str, Any]]
    patients_treated: int
    updated_at: datetime
