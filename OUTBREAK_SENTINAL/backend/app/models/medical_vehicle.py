from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class VehicleStatus(str, enum.Enum):
    idle = "idle"
    assigned = "assigned"
    on_route = "on_route"
    treating = "treating"
    completed = "completed"


class AssignmentStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    completed = "completed"


class RouteStatus(str, enum.Enum):
    active = "active"
    completed = "completed"


class MedicalVehicle(Base):
    __tablename__ = "medical_vehicles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_name: Mapped[str] = mapped_column(String(120), nullable=False)
    driver_name: Mapped[str] = mapped_column(String(120), nullable=False)
    contact_number: Mapped[str] = mapped_column(String(32), nullable=False)

    current_latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    current_longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fuel_level_percentage: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    vehicle_status: Mapped[VehicleStatus] = mapped_column(
        Enum(VehicleStatus, name="vehicle_status_enum"),
        nullable=False,
        default=VehicleStatus.idle,
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    assignments: Mapped[list["VehicleAssignment"]] = relationship(back_populates="vehicle")
    routes: Mapped[list["NavigationRoute"]] = relationship(back_populates="vehicle")
    location_logs: Mapped[list["VehicleLocationLog"]] = relationship(back_populates="vehicle")
    stock_usage: Mapped[list["VehicleStockUsage"]] = relationship(back_populates="vehicle")


class VehicleAssignment(Base):
    __tablename__ = "vehicle_assignments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medical_vehicles.id", ondelete="CASCADE"),
        nullable=False,
    )
    outbreak_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    assigned_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)

    assignment_status: Mapped[AssignmentStatus] = mapped_column(
        Enum(AssignmentStatus, name="vehicle_assignment_status_enum"),
        nullable=False,
        default=AssignmentStatus.pending,
    )

    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    vehicle: Mapped["MedicalVehicle"] = relationship(back_populates="assignments")

    __table_args__ = (Index("ix_vehicle_assignments_vehicle_id", "vehicle_id"),)


class NavigationRoute(Base):
    __tablename__ = "navigation_routes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medical_vehicles.id", ondelete="CASCADE"),
        nullable=False,
    )

    origin_lat: Mapped[float] = mapped_column(Float, nullable=False)
    origin_lng: Mapped[float] = mapped_column(Float, nullable=False)
    destination_lat: Mapped[float] = mapped_column(Float, nullable=False)
    destination_lng: Mapped[float] = mapped_column(Float, nullable=False)

    route_geometry: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    distance_km: Mapped[float] = mapped_column(Float, nullable=False)
    duration_minutes: Mapped[float] = mapped_column(Float, nullable=False)
    alternative_routes_json: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    selected_route_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    traffic_level: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    eta_timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    route_status: Mapped[RouteStatus] = mapped_column(
        Enum(RouteStatus, name="navigation_route_status_enum"),
        nullable=False,
        default=RouteStatus.active,
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    vehicle: Mapped["MedicalVehicle"] = relationship(back_populates="routes")

    __table_args__ = (Index("ix_navigation_routes_vehicle_id", "vehicle_id"),)


class VehicleLocationLog(Base):
    __tablename__ = "vehicle_location_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medical_vehicles.id", ondelete="CASCADE"),
        nullable=False,
    )

    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    speed: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    vehicle: Mapped["MedicalVehicle"] = relationship(back_populates="location_logs")

    __table_args__ = (
        Index("ix_vehicle_location_logs_vehicle_id", "vehicle_id"),
        Index("ix_vehicle_location_logs_vehicle_id_timestamp", "vehicle_id", "timestamp"),
    )


class VehicleStockUsage(Base):
    __tablename__ = "vehicle_stock_usage"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medical_vehicles.id", ondelete="CASCADE"),
        nullable=False,
    )

    medicine_name: Mapped[str] = mapped_column(String(120), nullable=False)
    quantity_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    equipment_used: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    patients_treated: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    vehicle: Mapped["MedicalVehicle"] = relationship(back_populates="stock_usage")

    __table_args__ = (Index("ix_vehicle_stock_usage_vehicle_id", "vehicle_id"),)
