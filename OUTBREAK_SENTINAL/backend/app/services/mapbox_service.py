from __future__ import annotations

"""
Mapbox integration utilities for traffic-aware routing.

This module calls Mapbox Directions API using a backend-only token and returns
route options normalized for the Navigation service.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx

from app.core.config import settings


@dataclass(frozen=True)
class MapboxRouteOption:
    geometry: dict[str, Any]
    distance_km: float
    duration_minutes: float
    traffic_level: Optional[str]
    raw: dict[str, Any]


def _traffic_level_from_route(route: dict[str, Any]) -> Optional[str]:
    try:
        legs = route.get("legs") or []
        congestions: list[str] = []
        for leg in legs:
            ann = (leg.get("annotation") or {}) if isinstance(leg, dict) else {}
            congestion = ann.get("congestion")
            if isinstance(congestion, list):
                congestions.extend([c for c in congestion if isinstance(c, str)])

        if not congestions:
            return None

        weights = {"low": 1, "moderate": 2, "heavy": 3, "severe": 4, "unknown": 2}
        avg = sum(weights.get(c, 2) for c in congestions) / max(len(congestions), 1)
        if avg < 1.8:
            return "low"
        if avg < 2.8:
            return "medium"
        return "high"
    except Exception:
        return None


async def fetch_directions(
    *,
    origin_lat: float,
    origin_lng: float,
    destination_lat: float,
    destination_lng: float,
    alternatives: bool = True,
) -> list[MapboxRouteOption]:
    """Fetch one or more route options from Mapbox Directions API.

    Uses the driving-traffic profile and requests congestion annotations when available.
    Geometry is returned as GeoJSON (LineString) for direct Mapbox GL JS rendering.
    """
    url = (
        f"{settings.mapbox_directions_base_url}/driving-traffic/"
        f"{origin_lng},{origin_lat};{destination_lng},{destination_lat}"
    )

    params = {
        "access_token": settings.mapbox_secret_token,
        "alternatives": "true" if alternatives else "false",
        "geometries": "geojson",
        "overview": "full",
        "steps": "false",
        "annotations": "congestion,distance,duration",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        payload = resp.json()

    routes = payload.get("routes")
    if not isinstance(routes, list) or not routes:
        raise RuntimeError("Mapbox Directions API returned no routes")

    options: list[MapboxRouteOption] = []
    for route in routes:
        if not isinstance(route, dict):
            continue
        geometry = (route.get("geometry") or {}) if isinstance(route.get("geometry"), dict) else {}
        distance_m = float(route.get("distance") or 0.0)
        duration_s = float(route.get("duration") or 0.0)
        traffic_level = _traffic_level_from_route(route)
        options.append(
            MapboxRouteOption(
                geometry=geometry,
                distance_km=distance_m / 1000.0,
                duration_minutes=duration_s / 60.0,
                traffic_level=traffic_level,
                raw=route,
            )
        )

    if not options:
        raise RuntimeError("Mapbox Directions API returned routes in an unexpected format")

    return options


def compute_eta_timestamp(duration_minutes: float) -> datetime:
    """Return a UTC ETA timestamp based on the duration in minutes."""
    return datetime.now(tz=timezone.utc) + timedelta(minutes=duration_minutes)
