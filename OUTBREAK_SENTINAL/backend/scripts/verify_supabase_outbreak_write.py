import asyncio
import os
import sys
from pathlib import Path


async def main() -> None:
    os.environ.setdefault("MAPBOX_SECRET_TOKEN", "test")

    backend_dir = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(backend_dir))

    from app.core.supabase_rest import supabase_rest

    payload = {
        "disease_type": "test",
        "severity": "mild",
        "affected_people": 1,
        "children": 0,
        "adults": 1,
        "elderly": 0,
        "outbreak_date": "2026-02-28",
        "notes": "rls test",
        "latitude": 0.0,
        "longitude": 0.0,
        "area_name": "test",
        "reported_by": "test",
    }

    rows = await supabase_rest.post("outbreaks", json=payload)
    outbreak_id = rows[0]["id"]
    await supabase_rest.delete("outbreaks", params={"id": f"eq.{outbreak_id}"})
    print(f"ok: {outbreak_id}")


if __name__ == "__main__":
    asyncio.run(main())
