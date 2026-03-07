from __future__ import annotations

from datetime import date
from datetime import datetime, timezone
from uuid import UUID
from uuid import uuid4

from fastapi import APIRouter, HTTPException, status

from app.core.supabase_rest import first_or_none, supabase_rest
from app.schemas.doctor_dashboard import (
    OutbreakCreateRequest,
    OutbreakResponse,
    RecoveryTrendDailyResponse,
    ResourceEquipmentResponse,
    ResourceMedicineResponse,
    ResourceStaffResponse,
    SupportRequestCreateRequest,
    SupportRequestResponse,
    TreatmentCategoryStatResponse,
)


def _date_key(dt: datetime) -> date:
    return dt.date()


def _clamp0(v: int) -> int:
    return v if v > 0 else 0
from app.services.websocket_manager import vehicle_ws_manager


router = APIRouter(tags=["Doctor Dashboard"])


@router.post("/outbreaks", response_model=OutbreakResponse, status_code=status.HTTP_201_CREATED)
async def create_outbreak(payload: OutbreakCreateRequest) -> OutbreakResponse:
    try:
        created = await supabase_rest.post("outbreaks", json=payload.model_dump(mode="json"))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Supabase insert failed: {exc}",
        ) from exc

    outbreak = first_or_none(created)
    if outbreak is None:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to create outbreak — empty response")


    vehicles = await supabase_rest.get(
        "medical_vehicles",
        params={
            "select": "id,vehicle_status,updated_at",
            "vehicle_status": "eq.idle",
            "order": "updated_at.desc",
            "limit": "1",
        },
    )
    vehicle = first_or_none(vehicles)
    if vehicle is not None:
        assignment_rows = await supabase_rest.post(
            "vehicle_assignments",
            json={
                "vehicle_id": vehicle["id"],
                "outbreak_id": outbreak["id"],
                "assigned_by": "00000000-0000-0000-0000-000000000000",
                "assignment_status": "pending",
            },
        )
        assignment = first_or_none(assignment_rows)
        if assignment is not None:
            await vehicle_ws_manager.broadcast(
                UUID(vehicle["id"]),
                {
                    "type": "assignment.new",
                    "vehicle_id": vehicle["id"],
                    "assignment_id": assignment["id"],
                    "outbreak_id": outbreak["id"],
                    "assignment_status": assignment.get("assignment_status", "pending"),
                },
            )

    return OutbreakResponse.model_validate(outbreak)


@router.get("/outbreaks", response_model=list[OutbreakResponse])
async def list_outbreaks(limit: int = 100) -> list[OutbreakResponse]:
    limit = min(max(limit, 1), 500)
    rows = await supabase_rest.get("outbreaks", params={"select": "*", "order": "created_at.desc", "limit": str(limit)})
    return [OutbreakResponse.model_validate(r) for r in (rows or [])]


@router.get("/outbreaks/{outbreak_id}", response_model=OutbreakResponse)
async def get_outbreak(outbreak_id: UUID) -> OutbreakResponse:
    rows = await supabase_rest.get("outbreaks", params={"select": "*", "id": f"eq.{outbreak_id}"})
    row = first_or_none(rows)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outbreak not found")
    return OutbreakResponse.model_validate(row)


@router.get("/resources/medicines", response_model=list[ResourceMedicineResponse])
async def list_resource_medicines() -> list[ResourceMedicineResponse]:
    rows = await supabase_rest.get("resource_medicines", params={"select": "*", "order": "medicine_name.asc"})
    return [ResourceMedicineResponse.model_validate(r) for r in (rows or [])]


@router.get("/resources/equipment", response_model=list[ResourceEquipmentResponse])
async def list_resource_equipment() -> list[ResourceEquipmentResponse]:
    rows = await supabase_rest.get("resource_equipment", params={"select": "*", "order": "equipment_name.asc"})
    return [ResourceEquipmentResponse.model_validate(r) for r in (rows or [])]


@router.get("/resources/staff", response_model=list[ResourceStaffResponse])
async def list_resource_staff() -> list[ResourceStaffResponse]:
    rows = await supabase_rest.get("resource_staff", params={"select": "*", "order": "role.asc"})
    return [ResourceStaffResponse.model_validate(r) for r in (rows or [])]


@router.post("/support-requests", response_model=SupportRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_support_request(payload: SupportRequestCreateRequest) -> SupportRequestResponse:
    rows = await supabase_rest.post("support_requests", json=payload.model_dump(mode="json"))
    row = first_or_none(rows)
    if row is None:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to create support request")
    return SupportRequestResponse.model_validate(row)


@router.get("/treatment/category-stats", response_model=list[TreatmentCategoryStatResponse])
async def list_treatment_category_stats(snapshot_date: date | None = None) -> list[TreatmentCategoryStatResponse]:
    params: dict[str, str] = {"select": "*", "order": "disease_type.asc"}
    if snapshot_date is not None:
        params["snapshot_date"] = f"eq.{snapshot_date.isoformat()}"
    rows = await supabase_rest.get("treatment_category_stats", params=params)
    return [TreatmentCategoryStatResponse.model_validate(r) for r in (rows or [])]


@router.get("/treatment/recovery-trend", response_model=list[RecoveryTrendDailyResponse])
async def list_recovery_trend(days: int = 14) -> list[RecoveryTrendDailyResponse]:
    days = min(max(days, 1), 90)
    rows = await supabase_rest.get("recovery_trend_daily", params={"select": "*", "order": "snapshot_date.desc", "limit": str(days)})
    data = [RecoveryTrendDailyResponse.model_validate(r) for r in (rows or [])]
    return list(reversed(data))


@router.get("/treatment/live-category-stats", response_model=list[TreatmentCategoryStatResponse])
async def list_live_treatment_category_stats() -> list[TreatmentCategoryStatResponse]:
    outbreaks = await supabase_rest.get("outbreaks", params={"select": "id,disease_type,affected_people,severity"})
    usage_rows = await supabase_rest.get(
        "vehicle_stock_usage",
        params={"select": "outbreak_id,patients_treated", "limit": "2000", "order": "updated_at.desc"},
    )

    treated_by_outbreak: dict[str, int] = {}
    for r in usage_rows or []:
        oid = r.get("outbreak_id")
        if not oid:
            continue
        treated_by_outbreak[str(oid)] = treated_by_outbreak.get(str(oid), 0) + int(r.get("patients_treated") or 0)

    by_disease: dict[str, dict[str, int]] = {}
    for ob in outbreaks or []:
        disease = str(ob.get("disease_type") or "Unknown")
        bucket = by_disease.setdefault(
            disease,
            {"total_cases": 0, "treated": 0, "critical": 0},
        )
        total = int(ob.get("affected_people") or 0)
        bucket["total_cases"] += total
        bucket["treated"] += int(treated_by_outbreak.get(str(ob.get("id")), 0))
        if str(ob.get("severity")) == "severe":
            bucket["critical"] += total

    today = date.today()
    now = datetime.now(tz=timezone.utc)
    out: list[TreatmentCategoryStatResponse] = []
    for disease, agg in by_disease.items():
        total_cases = int(agg.get("total_cases") or 0)
        treated = int(agg.get("treated") or 0)
        critical = int(agg.get("critical") or 0)
        under = _clamp0(total_cases - treated)
        out.append(
            TreatmentCategoryStatResponse(
                id=uuid4(),
                disease_type=disease,
                total_cases=total_cases,
                treated=treated,
                under_treatment=under,
                recovered=treated,
                critical=critical,
                snapshot_date=today,
                updated_at=now,
            )
        )

    out.sort(key=lambda r: r.disease_type.lower())
    return out


@router.get("/treatment/live-recovery-trend", response_model=list[RecoveryTrendDailyResponse])
async def list_live_recovery_trend(days: int = 14) -> list[RecoveryTrendDailyResponse]:
    days = min(max(days, 1), 90)
    outbreaks = await supabase_rest.get("outbreaks", params={"select": "id,affected_people"})
    total_cases = sum(int(o.get("affected_people") or 0) for o in (outbreaks or []))

    usage_rows = await supabase_rest.get(
        "vehicle_stock_usage",
        params={"select": "patients_treated,updated_at", "limit": "2000", "order": "updated_at.asc"},
    )

    treated_by_day: dict[date, int] = {}
    for r in usage_rows or []:
        ts = r.get("updated_at")
        if not ts:
            continue
        try:
            dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
        except Exception:
            continue
        d = _date_key(dt)
        treated_by_day[d] = treated_by_day.get(d, 0) + int(r.get("patients_treated") or 0)

    today = date.today()
    start = today.fromordinal(today.toordinal() - (days - 1))
    out: list[RecoveryTrendDailyResponse] = []
    cumulative = 0
    for i in range(days):
        d = start.fromordinal(start.toordinal() + i)
        delta = int(treated_by_day.get(d, 0))
        cumulative += delta
        active = _clamp0(total_cases - cumulative)
        out.append(
            RecoveryTrendDailyResponse(
                id=uuid4(),
                snapshot_date=d,
                recovered=cumulative,
                active=active,
                updated_at=datetime.now(tz=timezone.utc),
            )
        )
    return out
