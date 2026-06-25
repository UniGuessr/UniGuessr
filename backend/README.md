# ConUGuessr Backend

Backend service for ConUGuessr — a campus geoguessr game.

## Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL via Supabase (SQLAlchemy 2.0 async + asyncpg)
- **Migrations**: Alembic
- **Realtime**: Socket.IO (multiplayer)
- **Storage**: AWS S3 (location images)
- **Package Manager**: uv

## Project Structure

```
backend/
├── main.py                        # FastAPI entry point
├── Makefile                       # Dev commands
├── pyproject.toml                 # Dependencies
├── alembic.ini                    # Alembic config
├── alembic/                       # Database migrations
├── app/
│   ├── __init__.py                # Exports CONFIG_PATH
│   ├── config/                    # Env files (gitignored)
│   │   ├── .env.example           # Committed template — copy to .env.{APP_ENV}
│   │   └── .template.secrets      # Committed template — copy to .secrets.{APP_ENV}
│   ├── config_buildings.py        # Campus building coordinates and floor counts
│   ├── core/
│   │   ├── config.py              # Settings (pydantic-settings)
│   │   └── database.py            # Async engine and session factory
│   ├── api/                       # FastAPI routers
│   ├── models/                    # SQLAlchemy ORM models
│   ├── schemas/                   # Pydantic request/response schemas
│   ├── services/                  # Stateless async business logic
│   └── dependencies.py            # get_db dependency
└── scripts/                       # Utility scripts (seed, upload, etc.)
```

## Setup

### Prerequisites

- Python 3.12+
- [uv](https://github.com/astral-sh/uv) package manager

### Installation

```bash
make install
```

### Environment

Copy the templates and fill in real values:

```bash
cp app/config/.env.example app/config/.env.development
cp app/config/.template.secrets app/config/.secrets.development
```

Set `DATABASE_URL` in `.secrets.development` to your Supabase **Session Mode Pooler** URL (port 5432 — not the direct connection):

```
DATABASE_URL=postgresql+asyncpg://<user>:<password>@aws-1-us-east-2.pooler.supabase.com:5432/postgres
```

### Run Migrations

```bash
make migrate
```

### Run the Server

```bash
make run        # development (auto-reload)
make run-prod   # production
```

API: `http://localhost:8000` · Docs: `http://localhost:8000/docs`

## Makefile Targets

| Target | Description |
|---|---|
| `make install` | Install dependencies via uv |
| `make run` | Start dev server with auto-reload |
| `make run-prod` | Start production server |
| `make migrate` | Apply pending migrations |
| `make migrate-down` | Roll back one migration |
| `make migrate-create name="<msg>"` | Generate a new migration |
| `make migrate-status` | Show current migration revision |
| `make test-connection` | Verify DB connection |
| `make shell` | Open a Python REPL with app context |

## Scoring

Points per round based on distance from the actual location:

| Distance | Points |
|---|---|
| ≤ 10 m | 5000 |
| ≤ 50 m | 4000 |
| ≤ 100 m | 3000 |
| ≤ 250 m | 2000 |
| ≤ 500 m | 1000 |
| > 500 m | Decreases with distance |

Correct floor guess adds a bonus on top.
