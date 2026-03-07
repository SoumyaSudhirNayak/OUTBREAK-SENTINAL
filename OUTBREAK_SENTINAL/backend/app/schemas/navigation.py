from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.medical_vehicle import RouteStatus


class Coordinate(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"lat": 19.0760, "lng": 72.8777}})

    lat: float
    lng: float


class GenerateRouteRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "vehicle_id": "5c0a8d47-2a05-4b30-a690-1c31e25a2c1b",
                "origin": {"lat": 19.0760, "lng": 72.8777},
                "destination": {"lat": 19.1176, "lng": 72.9060},
            }
        }
    )

    vehicle_id: UUID
    origin: Optional[Coordinate] = None
    destination: Coordinate
    alternatives: bool = True


class RerouteRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"vehicle_id": "5c0a8d47-2a05-4b30-a690-1c31e25a2c1b"}})

    vehicle_id: UUID


class NavigationRouteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    vehicle_id: UUID
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    route_geometry: dict[str, Any]
    distance_km: float
    duration_minutes: float
    alternative_routes_json: Optional[dict[str, Any]]
    selected_route_index: int
    traffic_level: Optional[str]
    eta_timestamp: Optional[datetime]
    route_status: RouteStatus
    created_at: datetime
    updated_at: datetime


class RouteEnvelopeResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "active_route": {
                    "id": "01a4f2e0-71f7-4e7d-a7bf-7f4b2a0a79a4",
                    "vehicle_id": "5c0a8d47-2a05-4b30-a690-1c31e25a2c1b",
                    "origin_lat": 19.076,
                    "origin_lng": 72.8777,
                    "destination_lat": 19.1176,
                    "destination_lng": 72.906,
                    "route_geometry": {"type": "LineString", "coordinates": [[72.8777, 19.076], [72.906, 19.1176]]},
                    "distance_km": 8.9,
                    "duration_minutes": 21.5,
                    "alternative_routes_json": {"routes": []},
                    "selected_route_index": 0,
                    "traffic_level": "medium",
                    "eta_timestamp": "2026-02-27T12:25:00Z",
                    "route_status": "active",
                    "created_at": "2026-02-27T12:03:00Z",
                    "updated_at": "2026-02-27T12:03:00Z",
                }
            }
        }
    )

    active_route: NavigationRouteResponse
