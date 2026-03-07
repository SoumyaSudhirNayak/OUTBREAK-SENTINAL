from __future__ import annotations

import os
from pathlib import Path
from typing import Final, Optional


def _load_dotenv_if_present() -> None:
    try:
        from dotenv import load_dotenv  # type: ignore
    except Exception:
        return

    candidate_paths = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parents[2] / ".env",
        Path(__file__).resolve().parents[3] / ".env",
    ]

    for p in candidate_paths:
        if p.exists():
            load_dotenv(p, override=False)


_load_dotenv_if_present()


class Settings:
    def __init__(self) -> None:
        self.database_url: str = os.environ.get("DATABASE_URL", "")
        self.supabase_anon_key: str = os.environ.get("SUPABASE_ANON_KEY", "")
        self.supabase_service_role_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        self.supabase_api_key: str = self.supabase_service_role_key or self.supabase_anon_key or os.environ.get("supabase_key", "")
        if not self.supabase_api_key:
            raise RuntimeError("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY")
        self.supabase_project_url: str = (
            os.environ.get("SUPABASE_PROJECT_URL")
            or os.environ.get("SUPABASE_URL")
            or os.environ.get("supabase_url")
            or (self.database_url and _derive_supabase_project_url(self.database_url))
        )
        if not self.supabase_project_url:
            raise RuntimeError("Missing SUPABASE_PROJECT_URL (or SUPABASE_URL)")
        self.mapbox_secret_token: str = _get_required_env(
            "MAPBOX_SECRET_TOKEN",
            fallback_keys=["mapbox_token", "MAPBOX_TOKEN", "MAPBOX_ACCESS_TOKEN"],
        )
        self.mapbox_public_token: Optional[str] = os.environ.get(
            "MAPBOX_PUBLIC_TOKEN",
            os.environ.get("mapbox_public_token"),
        )

        self.mapbox_directions_base_url: str = os.environ.get(
            "MAPBOX_DIRECTIONS_BASE_URL",
            "https://api.mapbox.com/directions/v5/mapbox",
        )
        self.route_distance_weight: float = float(os.environ.get("ROUTE_DISTANCE_WEIGHT", "0.2"))
        self.reroute_improvement_threshold: float = float(os.environ.get("REROUTE_IMPROVEMENT_THRESHOLD", "0.10"))

        self.cors_allow_origins: list[str] = _split_csv(os.environ.get("CORS_ALLOW_ORIGINS", "*"))


def _split_csv(value: str) -> list[str]:
    value = value.strip()
    if not value:
        return []
    if value == "*":
        return ["*"]
    return [part.strip() for part in value.split(",") if part.strip()]


def _get_required_env(key: str, fallback_keys: Optional[list[str]] = None) -> str:
    candidates: list[str] = [key] + (fallback_keys or [])
    for k in candidates:
        v = os.environ.get(k)
        if v:
            return v
    raise RuntimeError(f"Missing required environment variable: {key}")


def _derive_supabase_project_url(database_url: str) -> str:
    host = ""
    if "@" in database_url:
        host = database_url.rsplit("@", 1)[-1]
        host = host.split("/", 1)[0]
        host = host.split(":", 1)[0]

    if host.startswith("db.") and host.endswith(".supabase.co"):
        ref = host[len("db.") : -len(".supabase.co")]
        return f"https://{ref}.supabase.co"

    raise RuntimeError("Unable to derive SUPABASE_PROJECT_URL; set SUPABASE_PROJECT_URL explicitly")


settings: Final[Settings] = Settings()
