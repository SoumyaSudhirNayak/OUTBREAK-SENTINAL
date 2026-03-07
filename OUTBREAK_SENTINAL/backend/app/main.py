from __future__ import annotations

"""
Medical Vehicle Module backend.

Exposes REST APIs for medical vehicle operations (registration, status, stock),
traffic-aware navigation via Mapbox, and a per-vehicle WebSocket channel for
real-time updates.
"""

from uuid import UUID

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.supabase_rest import supabase_rest
from app.routes import assignments_router, doctor_dashboard_router, navigation_router, stock_router, vehicles_router
from app.routes.navigation import reroute as navigation_reroute
from app.schemas.navigation import RerouteRequest
from app.services.websocket_manager import global_ws_manager, vehicle_ws_manager


app = FastAPI(
    title="Rural Health Logistics System - Medical Vehicle Module",
    version="0.1.0",
    description="Backend APIs and realtime channels for medical vehicle operations (routing, assignments, stock, live tracking).",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vehicles_router)
app.include_router(assignments_router)
app.include_router(navigation_router)
app.include_router(stock_router)
app.include_router(doctor_dashboard_router)


@app.get("/health")
async def health() -> dict:
    """Simple readiness probe."""
    return {"status": "ok"}


@app.get("/debug/supabase")
async def debug_supabase() -> dict:
    try:
        await supabase_rest.get("outbreaks", params={"select": "id", "limit": "1"})
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.websocket("/ws/vehicle/{vehicle_id}")
async def vehicle_ws(vehicle_id: str, websocket: WebSocket) -> None:
    """Vehicle-scoped WebSocket channel.

    Server -> client events are broadcast via the manager when assignments,
    routing, location, or stock updates occur.

    Client -> server supported message types:
    - ping
    - navigation.reroute_request
    """
    try:
        vehicle_uuid = UUID(vehicle_id)
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await vehicle_ws_manager.connect(vehicle_uuid, websocket)
    try:
        await vehicle_ws_manager.broadcast(vehicle_uuid, {"type": "ws.connected", "vehicle_id": vehicle_id})
        while True:
            message = await websocket.receive_json()
            msg_type = message.get("type")
            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            if msg_type == "navigation.reroute_request":
                try:
                    envelope = await navigation_reroute(RerouteRequest(vehicle_id=vehicle_uuid))
                    await websocket.send_json({"type": "navigation.reroute_done", "active_route": envelope.active_route.model_dump(mode="json")})
                except Exception:
                    await websocket.send_json({"type": "error", "detail": "Reroute failed"})
                continue

            await websocket.send_json({"type": "error", "detail": "Unsupported message type"})
    except WebSocketDisconnect:
        await vehicle_ws_manager.disconnect(vehicle_uuid, websocket)
    except Exception:
        await vehicle_ws_manager.disconnect(vehicle_uuid, websocket)
        try:
            await websocket.close()
        except Exception:
            pass


@app.websocket("/ws/global")
async def global_ws(websocket: WebSocket) -> None:
    await global_ws_manager.connect(websocket)
    try:
        await global_ws_manager.broadcast({"type": "ws.global.connected"})
        while True:
            message = await websocket.receive_json()
            msg_type = message.get("type")
            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue
            await websocket.send_json({"type": "error", "detail": "Unsupported message type"})
    except WebSocketDisconnect:
        await global_ws_manager.disconnect(websocket)
    except Exception:
        await global_ws_manager.disconnect(websocket)
        try:
            await websocket.close()
        except Exception:
            pass
