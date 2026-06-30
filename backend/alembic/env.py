"""alembic async migration environment."""

import asyncio
import os
from logging.config import fileConfig

from alembic import context

os.environ.setdefault("APP_ENV", "development")

from app.core.config import settings  # noqa: E402
from app.core.database import Base, engine  # noqa: E402
from app.models import Location, GameSession, LeaderboardEntry, Lobby, MultiplayerGame, University  # noqa: F401,E402

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    # Reuse the app engine so migrations inherit its IPv4-only connection logic
    # (the Supabase pooler's IPv6 addresses are unreachable on some networks).
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
