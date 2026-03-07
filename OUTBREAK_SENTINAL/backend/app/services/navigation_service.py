from __future__ import annotations

"""
Navigation domain logic for medical vehicles.

Responsibilities:
- Generate optimized routes (fastest ETA + configurable distance/traffic weight)
- Persist active route + alternatives for dashboard visualization
- Perform dynamic rerouting when the new ETA is >=10% better (configurable)
"""

from typing import Any, Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.medical_vehicle import MedicalVehicle, NavigationRoute, RouteStatus
from app.services.mapbox_service import MapboxRouteOption, compute_eta_timestamp, fetch_directions


def _traffic_penalty(level: Optional[str]) -> float:
    if level == "low" or level is None:
        return 0.0
    if level == "medium":
        return 2.0
    if level == "high":
        return 6.0
    return 2.0


def _score_route(option: MapboxRouteOption) -> float:
    return option.duration_minutes + settings.route_distance_weight * option.distance_km + _traffic_penalty(option.traffic_level)


def _serialize_option(option: MapboxRouteOption) -> dict[str, Any]:
    return {
        "geometry": option.geometry,
        "distance_km": option.distance_km,
        "duration_minutes": option.duration_minutes,
        "traffic_level": option.traffic_level,
        "score": _score_route(option),
    }


async def generate_optimized_route(
    session: AsyncSession,
    *,
    vehicle_id: UUID,
    origin_lat: float,
    origin_lng: float,
    destination_lat: float,
    destination_lng: float,
    alternatives: bool = True,
) -> NavigationRoute:
    """Generate and persist an active route for a vehicle.

    Stores:
    - selected route geometry + metrics
    - all alternatives with computed scores
    """
    vehicle = await session.get(MedicalVehicle, vehicle_id)
    if vehicle is None:
        raise KeyError("vehicle_not_found")

    options = await fetch_directions(
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        destination_lat=destination_lat,
        destination_lng=destination_lng,
        alternatives=alternatives,
    )

    scored = [(idx, _score_route(opt), opt) for idx, opt in enumerate(options)]
    scored.sort(key=lambda t: t[1])
    selected_idx, _, selected = scored[0]

    await session.execute(
        update(NavigationRoute)
        .where(NavigationRoute.vehicle_id == vehicle_id, NavigationRoute.route_status == RouteStatus.active)
        .values(route_status=RouteStatus.completed)
    )

    route = NavigationRoute(
        vehicle_id=vehicle_id,
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        destination_lat=destination_lat,
        destination_lng=destination_lng,
        route_geometry=selected.geometry,
        distance_km=selected.distance_km,
        duration_minutes=selected.duration_minutes,
        alternative_routes_json={"routes": [_serialize_option(o) for o in options]},
        selected_route_index=int(selected_idx),
        traffic_level=selected.traffic_level,
        eta_timestamp=compute_eta_timestamp(selected.duration_minutes),
        route_status=RouteStatus.active,
    )
    session.add(route)
    await session.commit()
    await session.refresh(route)
    return route


async def get_active_route(session: AsyncSession, *, vehicle_id: UUID) -> Optional[NavigationRoute]:
    """Return the most recently created active route for a vehicle (if any)."""
    stmt = (
        select(NavigationRoute)
        .where(NavigationRoute.vehicle_id == vehicle_id, NavigationRoute.route_status == RouteStatus.active)
        .order_by(NavigationRoute.created_at.desc())
        .limit(1)
    )
    return await session.scalar(stmt)


async def check_and_update_route(session: AsyncSession, *, vehicle_id: UUID) -> tuple[bool, NavigationRoute]:
    """Recompute route from current vehicle location and update when meaningfully faster.

    Returns:
    - (updated=False, route) if the improvement threshold is not met
    - (updated=True, route) after persisting a better route
    """
    route = await get_active_route(session, vehicle_id=vehicle_id)
    if route is None:
        raise KeyError("no_active_route")

    vehicle = await session.get(MedicalVehicle, vehicle_id)
    if vehicle is None:
        raise KeyError("vehicle_not_found")
    if vehicle.current_latitude is None or vehicle.current_longitude is None:
        raise ValueError("vehicle_location_missing")

    options = await fetch_directions(
        origin_lat=float(vehicle.current_latitude),
        origin_lng=float(vehicle.current_longitude),
        destination_lat=route.destination_lat,
        destination_lng=route.destination_lng,
        alternatives=True,
    )
    scored = [(idx, _score_route(opt), opt) for idx, opt in enumerate(options)]
    scored.sort(key=lambda t: t[1])
    selected_idx, _, selected = scored[0]

    current = float(route.duration_minutes)
    new = float(selected.duration_minutes)
    if current <= 0:
        improvement = 1.0
    else:
        improvement = (current - new) / current

    if improvement < settings.reroute_improvement_threshold:
        return False, route

    route.origin_lat = float(vehicle.current_latitude)
    route.origin_lng = float(vehicle.current_longitude)
    route.route_geometry = selected.geometry
    route.distance_km = selected.distance_km
    route.duration_minutes = selected.duration_minutes
    route.alternative_routes_json = {"routes": [_serialize_option(o) for o in options]}
    route.selected_route_index = int(selected_idx)
    route.traffic_level = selected.traffic_level
    route.eta_timestamp = compute_eta_timestamp(selected.duration_minutes)

    await session.commit()
    await session.refresh(route)
    return True, route
