"""async sqlalchemy engine, session factory, and declarative base."""

import asyncio
import socket
from urllib.parse import unquote, urlparse

import asyncpg
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

_url = urlparse(settings.database_url)
_port = _url.port or 5432


async def _connect() -> asyncpg.Connection:
    # The Supabase pooler hostname resolves to both IPv4 and IPv6, with IPv6
    # listed first. On networks without working IPv6 the default path stalls on
    # the unreachable IPv6 addresses before failing over. Resolve both families
    # and try IPv4 first, leaving IPv6 as a fallback so this still works on
    # IPv6-only hosts.
    infos = await asyncio.get_running_loop().getaddrinfo(
        _url.hostname, _port, type=socket.SOCK_STREAM
    )
    infos.sort(key=lambda info: 0 if info[0] == socket.AF_INET else 1)
    hosts = [info[4][0] for info in infos]
    return await asyncpg.connect(
        host=hosts,
        port=_port,
        user=unquote(_url.username or ""),
        password=unquote(_url.password or ""),
        database=_url.path.lstrip("/") or "postgres",
        ssl="require",
    )


engine = create_async_engine(
    settings.database_url,
    async_creator=_connect,
    echo=False,
)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass
