from __future__ import annotations

from collections.abc import AsyncGenerator
from urllib.parse import quote

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings


def _to_async_database_url(url: str) -> str:
    url = _normalize_postgres_url(url)
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


def _normalize_postgres_url(url: str) -> str:
    if not (url.startswith("postgresql://") or url.startswith("postgres://")):
        return url
    scheme_sep = url.find("//")
    if scheme_sep == -1:
        return url
    at = url.rfind("@")
    if at == -1:
        return url
    userinfo = url[scheme_sep + 2 : at]
    if ":" not in userinfo:
        return url
    user, password = userinfo.split(":", 1)
    if "@" not in password:
        return url
    safe_password = quote(password, safe="")
    return f"{url[: scheme_sep + 2]}{user}:{safe_password}@{url[at + 1 :]}"


engine = create_async_engine(
    _to_async_database_url(settings.database_url),
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False, class_=AsyncSession)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
