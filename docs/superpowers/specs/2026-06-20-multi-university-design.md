# Multi-University Support + Backend Restructure Design

**Date:** 2026-06-20  
**Status:** Approved

## Context

Two changes are being made together because the structural refactor is a prerequisite for the feature work:

1. **Backend restructure** — adopt the bedrock backend pattern: SQLAlchemy 2.0 ORM + asyncpg + Alembic migrations, `app/` directory layout, separate `schemas/` (Pydantic) vs `models/` (ORM), stateless service functions. Replace supabase-py with direct Postgres connection to Supabase.

2. **Multi-university support** — add McGill University alongside Concordia. Players choose a university (or "All") when starting single-player or multiplayer games. Leaderboard gains a university filter with a global "All" view.

---

## Part 1: Backend Structure (Bedrock Pattern)

### Directory Layout

```
backend/
├── main.py                        # FastAPI app, lifespan, CORS, routers
├── pyproject.toml
├── alembic.ini
├── alembic/
│   ├── env.py                     # Async migration runner
│   └── versions/
│       └── 0001_initial_schema.py # All 5 tables
├── app/
│   ├── __init__.py
│   ├── dependencies.py            # get_db() shared DI
│   ├── core/
│   │   ├── config.py              # Pydantic Settings (.env.{APP_ENV} + .secrets.{APP_ENV})
│   │   └── database.py            # SQLAlchemy async engine + session factory + Base
│   ├── models/                    # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── location.py
│   │   ├── game_session.py        # renamed from session.py (avoids SQLAlchemy naming clash)
│   │   ├── leaderboard.py
│   │   ├── lobby.py
│   │   └── multiplayer_game.py
│   ├── schemas/                   # Pydantic request/response schemas
│   │   ├── location.py
│   │   ├── session.py
│   │   ├── leaderboard.py
│   │   └── multiplayer.py
│   ├── services/                  # Stateless async functions (no classes)
│   │   ├── location_service.py
│   │   ├── session_service.py
│   │   ├── leaderboard_service.py
│   │   ├── multiplayer_service.py
│   │   └── s3_service.py
│   └── api/                       # FastAPI routers (renamed from routes/)
│       ├── __init__.py
│       ├── locations.py
│       ├── sessions.py
│       ├── leaderboard.py
│       ├── multiplayer.py
│       └── websocket.py
```

The old `src/` directory is deleted after migration. `config_buildings.py` moves to `app/config_buildings.py`.

### Database Connection

Replace supabase-py with SQLAlchemy + asyncpg connecting directly to Supabase's PostgreSQL:

```
postgresql+asyncpg://postgres:{DB_PASSWORD}@db.{PROJECT_REF}.supabase.co:5432/postgres
```

Dev values: `DB_PASSWORD=campus-guessr-dev`, `PROJECT_REF=vmmzapezwzywohswqxuq`

### Config Pattern

Split env files like bedrock — public config in `.env.{APP_ENV}`, secrets in `.secrets.{APP_ENV}` (both gitignored). `APP_ENV` selects the pair.

`.env.development` (non-secret):
```
APP_ENV=development
DB_HOST=db.vmmzapezwzywohswqxuq.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true
AWS_REGION=us-east-2
S3_BUCKET_NAME=conuguessr
S3_BASE_URL=https://conuguessr.s3.us-east-2.amazonaws.com
```

`.secrets.development` (secret, gitignored):
```
DB_PASSWORD=campus-guessr-dev
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### SQLAlchemy Models

All models use `DeclarativeBase`, UUID primary keys, `Mapped` columns. JSON columns (for nested arrays) use `JSONB` dialect type for PostgreSQL array-length querying.

Key models:
- `Location` — flat columns + `university: Mapped[str | None]`
- `GameSession` — `location_ids: Mapped[list] = mapped_column(JSONB)`, `guesses: Mapped[list] = mapped_column(JSONB)`, `university: Mapped[str | None]`
- `LeaderboardEntry` — flat columns + `university: Mapped[str | None]`
- `Lobby` — `players: Mapped[list] = mapped_column(JSONB)`, `university: Mapped[str | None]`
- `MultiplayerGame` — `location_ids: Mapped[list] = mapped_column(JSONB)`, `players: Mapped[list] = mapped_column(JSONB)`

### Alembic Migration

Single initial migration `0001_initial_schema.py` creates all 5 tables with `university` column included from the start. Replaces the manual `schema.sql` file.

### Service Pattern (Stateless Functions)

Replace class-based services with stateless async functions matching bedrock:

```python
# Before (class-based)
class LocationService:
    def __init__(self, client): ...
    async def get_location(self, id): ...

# After (stateless)
async def get_location(location_id: str, db: AsyncSession) -> Location | None:
    result = await db.execute(select(Location).where(Location.id == location_id))
    return result.scalar_one_or_none()
```

Services receive `AsyncSession` via function argument. No instantiation needed.

`get_random_locations` uses SQLAlchemy's `func.random()` instead of a Postgres RPC:
```python
query = select(Location).order_by(func.random()).limit(count)
if university:
    query = query.where(or_(Location.university == university, Location.university.is_(None)))
```

### Dependency Injection

```python
# app/dependencies.py
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
```

Routes use `db: AsyncSession = Depends(get_db)` and call service functions directly.

---

## Part 2: Multi-University Feature

### Data Model

`university` is a nullable TEXT column (NULL = "All campuses").

| Model | New Column |
|---|---|
| `Location` | `university: Mapped[str \| None]` |
| `GameSession` | `university: Mapped[str \| None]` |
| `LeaderboardEntry` | `university: Mapped[str \| None]` |
| `Lobby` | `university: Mapped[str \| None]` |

Valid values: `'concordia'`, `'mcgill'`, `NULL`.

Alembic migration includes these columns from the start — no separate migration needed.

### Backend Changes

**LocationService — `get_random_locations`:**
```python
async def get_random_locations(count: int, db: AsyncSession, university: str | None = None) -> list[Location]:
    query = select(Location).order_by(func.random()).limit(count)
    if university:
        query = query.where(or_(Location.university == university, Location.university.is_(None)))
    result = await db.execute(query)
    return result.scalars().all()
```

**SessionCreate schema:**
```python
class SessionCreate(BaseModel):
    rounds: int = Field(default=5, ge=1, le=20)
    difficulty: DifficultyEnum = DifficultyEnum.easy
    university: str | None = None  # 'concordia' | 'mcgill' | None
```

**Session service:** passes `university` to `get_random_locations`, stores on `GameSession` row.

**LeaderboardService:** `get_top_scores`, `count_entries`, `get_user_rank` accept `university: str | None`. When provided, filter `WHERE university = :university`. When `NULL`, return global (all rows). University-specific boards never include "All" scores (`university IS NULL` rows).

**MultiplayerService:** `LobbyCreate` schema gains `university: str | None`. Passed from lobby creation → `get_random_locations`.

### API Endpoints (new params)

| Endpoint | New Param |
|---|---|
| `POST /api/sessions` | `university` in body |
| `GET /api/leaderboard` | `university` query param |
| `GET /api/leaderboard/user/{username}/rank` | `university` query param |
| `GET /api/leaderboard/count` | `university` query param |
| `POST /api/multiplayer/lobbies` | `university` in `LobbyCreate` body |

### Frontend Changes

**Game start screen** — university picker (first step, before rounds/timer):
```
[ Concordia ]  [ McGill ]  [ All ]
```
Passed as `university` in `createSession` body. Default: `null` (All).

**Lobby create** — same university picker. University shown in lobby details.

**Leaderboard** — new filter row above rounds/difficulty:
```
[ All ]  [ Concordia ]  [ McGill ]
```
"All" tab → global scores only (university=NULL rows). University tabs → filtered.

**TypeScript types** — add `university?: string | null` to `Session`, `LeaderboardEntry`, relevant create schemas.

---

## Migration Path

1. Run Alembic migration against Supabase dev DB
2. Existing data stays intact (new `university` columns default to NULL)
3. Tag existing Concordia locations via seed script update
4. Delete old `src/` and `supabase/schema.sql`

---

## Out of Scope

- Campus-level selection within Concordia (SGW vs Loyola)
- Upload page university tagging UI
- Per-university stats on homepage
- Adding more than 2 universities
