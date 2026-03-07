from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any, Optional

import httpx

from app.core.config import settings


def _b64url(data: bytes) -> bytes:
    return base64.urlsafe_b64encode(data).rstrip(b"=")


def _as_supabase_jwt(key_or_secret: str, project_url: str) -> str:
    if key_or_secret.count(".") == 2:
        return key_or_secret

    ref = project_url.replace("https://", "").replace("http://", "").split(".", 1)[0]
    now = int(time.time())
    payload = {
        "iss": "supabase",
        "ref": ref,
        "role": "service_role",
        "iat": now,
        "exp": now + 60 * 60 * 24 * 365 * 10,
    }
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = _b64url(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = header_b64 + b"." + payload_b64
    sig = hmac.new(key_or_secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return (signing_input + b"." + _b64url(sig)).decode("utf-8")


class SupabaseRestClient:
    def __init__(self) -> None:
        self._base_url = settings.supabase_project_url.rstrip("/") + "/rest/v1"
        token = settings.supabase_api_key
        self._headers = {"apikey": token, "content-type": "application/json"}
        if token.count(".") == 2:
            self._headers["authorization"] = f"Bearer {token}"

    async def get(self, table: str, *, params: dict[str, Any]) -> Any:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(f"{self._base_url}/{table}", headers=self._headers, params=params)
            resp.raise_for_status()
            return resp.json()

    async def post(self, table: str, *, json: Any) -> Any:
        headers = {**self._headers, "prefer": "return=representation"}
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(f"{self._base_url}/{table}", headers=headers, json=json)
            if not resp.is_success:
                raise RuntimeError(
                    f"Supabase POST /{table} failed {resp.status_code}: {resp.text}"
                )
            return resp.json()

    async def patch(self, table: str, *, params: dict[str, Any], json: Any) -> Any:
        headers = {**self._headers, "prefer": "return=representation"}
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.patch(f"{self._base_url}/{table}", headers=headers, params=params, json=json)
            resp.raise_for_status()
            return resp.json()

    async def delete(self, table: str, *, params: dict[str, Any]) -> Any:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.delete(f"{self._base_url}/{table}", headers=self._headers, params=params)
            resp.raise_for_status()
            return resp.text


supabase_rest = SupabaseRestClient()


def first_or_none(rows: Any) -> Optional[dict[str, Any]]:
    if isinstance(rows, list) and rows:
        if isinstance(rows[0], dict):
            return rows[0]
    return None
