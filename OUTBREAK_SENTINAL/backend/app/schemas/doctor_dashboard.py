from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.doctor_dashboard import OutbreakSeverity, SupportRequestStatus


class OutbreakCreateRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "disease_type": "malaria",
                "severity": "severe",
                "affected_people": 45,
                "children": 12,
                "adults": 28,
                "elderly": 5,
                "outbreak_date": "2026-02-27",
                "notes": "Fever cluster; stagnant water nearby.",
                "latitude": 23.8103,
                "longitude": 78.1489,
                "area_name": "Rampur Village",
                "reported_by": "Dr. Kumar",
            }
        }
    )

    disease_type: str = Field(min_length=1, max_length=80)
    severity: OutbreakSeverity

    affected_people: int = Field(ge=0)
    children: int = Field(ge=0)
    adults: int = Field(ge=0)
    elderly: int = Field(ge=0)

    outbreak_date: date
    notes: Optional[str] = None
    latitude: float
    longitude: float
    area_name: Optional[str] = Field(default=None, max_length=180)
    reported_by: Optional[str] = Field(default=None, max_length=120)


class OutbreakResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    disease_type: str
    severity: OutbreakSeverity
    affected_people: int
    children: int
    adults: int
    elderly: int
    outbreak_date: date
    notes: Optional[str]
    latitude: float
    longitude: float
    area_name: Optional[str]
    reported_by: Optional[str]
    created_at: datetime
    updated_at: datetime


class ResourceMedicineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    medicine_name: str
    stock_count: int
    low_stock_threshold: int
    updated_at: datetime


class ResourceEquipmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    equipment_name: str
    available: int
    total: int
    icon: Optional[str]
    updated_at: datetime


class ResourceStaffResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    role: str
    available: int
    total: int
    updated_at: datetime


class SupportRequestCreateRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"resource_type": "Medicine", "description": "Need ORS and antimalarials", "requested_by": "Dr. Kumar"}})

    resource_type: str = Field(min_length=1, max_length=40)
    description: str = Field(min_length=1)
    requested_by: Optional[str] = Field(default=None, max_length=120)


class SupportRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    resource_type: str
    description: str
    requested_by: Optional[str]
    status: SupportRequestStatus
    created_at: datetime
    updated_at: datetime


class TreatmentCategoryStatResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    disease_type: str
    total_cases: int
    treated: int
    under_treatment: int
    recovered: int
    critical: int
    snapshot_date: date
    updated_at: datetime


class RecoveryTrendDailyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    snapshot_date: date
    recovered: int
    active: int
    updated_at: datetime
