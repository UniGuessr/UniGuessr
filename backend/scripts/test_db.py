"""Test database connection."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text

from app.core.config import settings
from app.core.database import AsyncSessionLocal


async def main():
    print(f"APP_ENV : {settings.app_env}")
    print(f"DB host : {settings.db_host}")
    print()
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT version()"))
            version = result.scalar_one()
            print(f"Connected: {version[:60]}...")
            tables_result = await session.execute(
                text(
                    "SELECT tablename FROM pg_tables "
                    "WHERE schemaname = 'public' ORDER BY tablename"
                )
            )
            tables = [row[0] for row in tables_result]
            if tables:
                print(f"Tables: {', '.join(tables)}")
            else:
                print("No tables found — run: make migrate")
    except Exception as e:
        print(f"Connection failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
