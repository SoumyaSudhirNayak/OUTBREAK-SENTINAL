from __future__ import annotations

import enum
import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, Enum, Float, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class OutbreakSeverity(str, enum.Enum):
    mild = "mild"
    moderate = "moderate"
    severe = "severe"


class SupportRequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    completed = "completed"


class Outbreak(Base):
    __tablename__ = "outbreaks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    disease_type: Mapped[str] = mapped_column(String(80), nullable=False)
    severity: Mapped[OutbreakSeverity] = mapped_column(Enum(OutbreakSeverity, name="outbreak_severity_enum"), nullable=False)

    affected_people: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    children: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    adults: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    elderly: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    outbreak_date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    area_name: Mapped[Optional[str]] = mapped_column(String(180), nullable=True)
    reported_by: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        Index("ix_outbreaks_created_at", "created_at"),
        Index("ix_outbreaks_disease_type", "disease_type"),
    )


class ResourceMedicine(Base):
    __tablename__ = "resource_medicines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medicine_name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    stock_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class ResourceEquipment(Base):
    __tablename__ = "resource_equipment"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    available: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    icon: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class ResourceStaff(Base):
    __tablename__ = "resource_staff"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    available: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class SupportRequest(Base):
    __tablename__ = "support_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_type: Mapped[str] = mapped_column(String(40), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    requested_by: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    status: Mapped[SupportRequestStatus] = mapped_column(
        Enum(SupportRequestStatus, name="support_request_status_enum"),
        nullable=False,
        default=SupportRequestStatus.pending,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (Index("ix_support_requests_created_at", "created_at"),)


class TreatmentCategoryStat(Base):
    __tablename__ = "treatment_category_stats"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    disease_type: Mapped[str] = mapped_column(String(80), nullable=False)
    total_cases: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    treated: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    under_treatment: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    recovered: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    critical: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False, server_default=func.current_date())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (Index("ix_treatment_category_stats_snapshot_date", "snapshot_date"),)


class RecoveryTrendDaily(Base):
    __tablename__ = "recovery_trend_daily"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False, unique=True)
    recovered: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    active: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
