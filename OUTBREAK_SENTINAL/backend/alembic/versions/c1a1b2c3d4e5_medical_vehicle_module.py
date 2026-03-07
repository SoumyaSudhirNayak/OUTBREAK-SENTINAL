from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "c1a1b2c3d4e5"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    vehicle_status = postgresql.ENUM(
        "idle",
        "assigned",
        "on_route",
        "treating",
        "completed",
        name="vehicle_status_enum",
    )
    assignment_status = postgresql.ENUM(
        "pending",
        "accepted",
        "rejected",
        "completed",
        name="vehicle_assignment_status_enum",
    )
    route_status = postgresql.ENUM(
        "active",
        "completed",
        name="navigation_route_status_enum",
    )

    vehicle_status.create(op.get_bind(), checkfirst=True)
    assignment_status.create(op.get_bind(), checkfirst=True)
    route_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "medical_vehicles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("vehicle_name", sa.String(length=120), nullable=False),
        sa.Column("driver_name", sa.String(length=120), nullable=False),
        sa.Column("contact_number", sa.String(length=32), nullable=False),
        sa.Column("current_latitude", sa.Float(), nullable=True),
        sa.Column("current_longitude", sa.Float(), nullable=True),
        sa.Column("fuel_level_percentage", sa.Integer(), nullable=True),
        sa.Column("vehicle_status", vehicle_status, nullable=False, server_default="idle"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "vehicle_assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("vehicle_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("outbreak_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assigned_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("assignment_status", assignment_status, nullable=False, server_default="pending"),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["vehicle_id"], ["medical_vehicles.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_vehicle_assignments_vehicle_id", "vehicle_assignments", ["vehicle_id"])

    op.create_table(
        "navigation_routes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("vehicle_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("origin_lat", sa.Float(), nullable=False),
        sa.Column("origin_lng", sa.Float(), nullable=False),
        sa.Column("destination_lat", sa.Float(), nullable=False),
        sa.Column("destination_lng", sa.Float(), nullable=False),
        sa.Column("route_geometry", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("distance_km", sa.Float(), nullable=False),
        sa.Column("duration_minutes", sa.Float(), nullable=False),
        sa.Column("alternative_routes_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("selected_route_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("traffic_level", sa.String(length=32), nullable=True),
        sa.Column("eta_timestamp", sa.DateTime(timezone=True), nullable=True),
        sa.Column("route_status", route_status, nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["vehicle_id"], ["medical_vehicles.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_navigation_routes_vehicle_id", "navigation_routes", ["vehicle_id"])

    op.create_table(
        "vehicle_location_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("vehicle_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("speed", sa.Float(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["vehicle_id"], ["medical_vehicles.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_vehicle_location_logs_vehicle_id", "vehicle_location_logs", ["vehicle_id"])
    op.create_index("ix_vehicle_location_logs_vehicle_id_timestamp", "vehicle_location_logs", ["vehicle_id", "timestamp"])

    op.create_table(
        "vehicle_stock_usage",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("vehicle_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("medicine_name", sa.String(length=120), nullable=False),
        sa.Column("quantity_used", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("equipment_used", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("patients_treated", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["vehicle_id"], ["medical_vehicles.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_vehicle_stock_usage_vehicle_id", "vehicle_stock_usage", ["vehicle_id"])


def downgrade() -> None:
    op.drop_index("ix_vehicle_stock_usage_vehicle_id", table_name="vehicle_stock_usage")
    op.drop_table("vehicle_stock_usage")

    op.drop_index("ix_vehicle_location_logs_vehicle_id_timestamp", table_name="vehicle_location_logs")
    op.drop_index("ix_vehicle_location_logs_vehicle_id", table_name="vehicle_location_logs")
    op.drop_table("vehicle_location_logs")

    op.drop_index("ix_navigation_routes_vehicle_id", table_name="navigation_routes")
    op.drop_table("navigation_routes")

    op.drop_index("ix_vehicle_assignments_vehicle_id", table_name="vehicle_assignments")
    op.drop_table("vehicle_assignments")

    op.drop_table("medical_vehicles")

    postgresql.ENUM(name="navigation_route_status_enum").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="vehicle_assignment_status_enum").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="vehicle_status_enum").drop(op.get_bind(), checkfirst=True)
