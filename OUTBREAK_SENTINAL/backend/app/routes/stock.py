from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ConfigDict

from app.core.supabase_rest import first_or_none, supabase_rest
from app.schemas.stock import VehicleStockUpdateRequest, VehicleStockUsageResponse
from app.services.websocket_manager import global_ws_manager, vehicle_ws_manager


router = APIRouter(prefix="/vehicle", tags=["Vehicle Stock"])


class ResourceSnapshot(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    kind: str
    name: str
    available: int
    total: int | None = None
    threshold: int | None = None


@router.post("/stock/update", response_model=VehicleStockUsageResponse, status_code=status.HTTP_201_CREATED)
async def update_stock(payload: VehicleStockUpdateRequest) -> VehicleStockUsageResponse:
    v_rows = await supabase_rest.get("medical_vehicles", params={"select": "id", "id": f"eq.{payload.vehicle_id}"})
    if first_or_none(v_rows) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    outbreak_id = payload.outbreak_id
    if outbreak_id is None:
        a_rows = await supabase_rest.get(
            "vehicle_assignments",
            params={
                "select": "outbreak_id,assignment_status,assigned_at",
                "vehicle_id": f"eq.{payload.vehicle_id}",
                "assignment_status": "in.(accepted,pending)",
                "order": "assigned_at.desc",
                "limit": "1",
            },
        )
        a = first_or_none(a_rows)
        if a is not None and a.get("outbreak_id"):
            try:
                outbreak_id = UUID(str(a.get("outbreak_id")))
            except Exception:
                outbreak_id = None

    rows = await supabase_rest.post(
        "vehicle_stock_usage",
        json={
            "vehicle_id": str(payload.vehicle_id),
            "outbreak_id": str(outbreak_id) if outbreak_id is not None else None,
            "medicine_name": payload.medicine_name,
            "quantity_used": payload.quantity_used,
            "equipment_used": payload.equipment_used,
            "patients_treated": payload.patients_treated,
        },
    )
    usage = first_or_none(rows)
    if usage is None:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to update stock")

    medicine_update = None
    if payload.quantity_used > 0:
        m_rows = await supabase_rest.get(
            "resource_medicines",
            params={"select": "id,medicine_name,stock_count,low_stock_threshold", "medicine_name": f"eq.{payload.medicine_name}"},
        )
        med = first_or_none(m_rows)
        if med is not None and med.get("id"):
            current = int(med.get("stock_count") or 0)
            new_count = max(0, current - int(payload.quantity_used))
            patched = await supabase_rest.patch(
                "resource_medicines",
                params={"id": f"eq.{med['id']}"},
                json={"stock_count": new_count},
            )
            med2 = first_or_none(patched)
            if med2 is not None:
                medicine_update = ResourceSnapshot(
                    kind="medicine",
                    name=str(med2.get("medicine_name") or payload.medicine_name),
                    available=int(med2.get("stock_count") or new_count),
                    total=None,
                    threshold=int(med2.get("low_stock_threshold") or 0),
                ).model_dump(mode="json")

    equipment_updates: list[dict] = []
    if isinstance(payload.equipment_used, dict) and payload.equipment_used:
        for key, raw in payload.equipment_used.items():
            if not isinstance(key, str) or not key.strip():
                continue
            if not isinstance(raw, (int, float)):
                continue
            used = int(raw)
            if used <= 0:
                continue
            e_rows = await supabase_rest.get(
                "resource_equipment",
                params={"select": "id,equipment_name,available,total", "equipment_name": f"eq.{key}"},
            )
            eq = first_or_none(e_rows)
            if eq is None or not eq.get("id"):
                continue
            current_avail = int(eq.get("available") or 0)
            total = int(eq.get("total") or 0)
            new_avail = max(0, current_avail - used)
            patched = await supabase_rest.patch(
                "resource_equipment",
                params={"id": f"eq.{eq['id']}"},
                json={"available": new_avail},
            )
            eq2 = first_or_none(patched)
            if eq2 is not None:
                equipment_updates.append(
                    ResourceSnapshot(
                        kind="equipment",
                        name=str(eq2.get("equipment_name") or key),
                        available=int(eq2.get("available") or new_avail),
                        total=int(eq2.get("total") or total),
                        threshold=None,
                    ).model_dump(mode="json")
                )

    await vehicle_ws_manager.broadcast(
        payload.vehicle_id,
        {
            "type": "treatment.stock_updated",
            "vehicle_id": str(payload.vehicle_id),
            "stock_usage": VehicleStockUsageResponse.model_validate(usage).model_dump(mode="json"),
        },
    )

    await global_ws_manager.broadcast(
        {
            "type": "resources.updated",
            "vehicle_id": str(payload.vehicle_id),
            "outbreak_id": str(outbreak_id) if outbreak_id is not None else None,
            "patients_treated": int(payload.patients_treated),
            "medicine": medicine_update,
            "equipment": equipment_updates,
        }
    )

    return VehicleStockUsageResponse.model_validate(usage)


@router.get("/stock/{vehicle_id}", response_model=list[VehicleStockUsageResponse])
async def get_stock(vehicle_id: UUID, limit: int = 200, outbreak_id: UUID | None = None) -> list[VehicleStockUsageResponse]:
    v_rows = await supabase_rest.get("medical_vehicles", params={"select": "id", "id": f"eq.{vehicle_id}"})
    if first_or_none(v_rows) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    limit = min(max(limit, 1), 2000)
    params = {"select": "*", "vehicle_id": f"eq.{vehicle_id}", "order": "updated_at.desc", "limit": str(limit)}
    if outbreak_id is not None:
        params["outbreak_id"] = f"eq.{outbreak_id}"
    rows = await supabase_rest.get("vehicle_stock_usage", params=params)
    return [VehicleStockUsageResponse.model_validate(r) for r in (rows or [])]
