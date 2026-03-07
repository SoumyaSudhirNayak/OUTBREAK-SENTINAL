from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any
from uuid import UUID

from fastapi import WebSocket


class VehicleWebSocketManager:
    def __init__(self) -> None:
        self._connections: dict[UUID, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, vehicle_id: UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[vehicle_id].add(websocket)

    async def disconnect(self, vehicle_id: UUID, websocket: WebSocket) -> None:
        async with self._lock:
            conns = self._connections.get(vehicle_id)
            if not conns:
                return
            conns.discard(websocket)
            if not conns:
                self._connections.pop(vehicle_id, None)

    async def broadcast(self, vehicle_id: UUID, message: dict[str, Any]) -> None:
        async with self._lock:
            targets = list(self._connections.get(vehicle_id, set()))
        for ws in targets:
            try:
                await ws.send_json(message)
            except Exception:
                await self.disconnect(vehicle_id, ws)


vehicle_ws_manager = VehicleWebSocketManager()


class GlobalWebSocketManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections.discard(websocket)

    async def broadcast(self, message: dict[str, Any]) -> None:
        async with self._lock:
            targets = list(self._connections)
        for ws in targets:
            try:
                await ws.send_json(message)
            except Exception:
                await self.disconnect(ws)


global_ws_manager = GlobalWebSocketManager()
