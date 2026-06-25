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
│   ├── config/
│   │   ├── env/                   # Non-secret config (committed: .env.example)
│   │   │   └── .env.{APP_ENV}     # Your copy (gitignored)
│   │   └── secrets/              # Secrets (committed: .template.secrets)
│   │       └── .secrets.{APP_ENV} # Your copy (gitignored)
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

## Quick Start

Prerequisites: **Python 3.12+** and [uv](https://github.com/astral-sh/uv).

```bash
# 1. install dependencies
make install

# 2. create your env files from the templates
cp app/config/env/.env.example       app/config/env/.env.development
cp app/config/secrets/.template.secrets app/config/secrets/.secrets.development

# 3. fill in the values (see "Environment Variables" below)

# 4. apply database migrations
make migrate

# 5. start the dev server (auto-reload)
make run
```

API: `http://localhost:8000` · Docs: `http://localhost:8000/docs` · Health: `http://localhost:8000/health`

> `make run` sets `APP_ENV=development`, so it loads `app/config/env/.env.development`
> and `app/config/secrets/.secrets.development`. For production use `make run-prod`
> (loads the `.production` files) or set the variables directly in your host's dashboard
> (OS env vars take precedence over the files).

## Environment Variables

**Non-secret** — `app/config/env/.env.development`:

| Variable | Required | Example |
|---|---|---|
| `CORS_ORIGINS` | **yes** | `http://localhost:3000,http://127.0.0.1:3000` (comma-separated) |
| `APP_ENV` | no | `development` |
| `AWS_REGION` | for S3 | `us-east-1` |
| `S3_BUCKET_NAME` | for S3 | `uniguessr-dev` |
| `S3_BASE_URL` | for S3 | `https://uniguessr-dev.s3.us-east-1.amazonaws.com` |

**Secret** — `app/config/secrets/.secrets.development` (never commit):

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | **yes** | Supabase **Session Mode Pooler** URL, port 5432 |
| `AWS_ACCESS_KEY_ID` | for S3 | IAM key with bucket write access |
| `AWS_SECRET_ACCESS_KEY` | for S3 | — |

`DATABASE_URL` format (note `+asyncpg` and the pooler host, **not** the direct connection):

```
DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>.pooler.supabase.com:5432/postgres
```

> The app **will not start** without `DATABASE_URL` and `CORS_ORIGINS` — both are required.
> S3 image upload needs the AWS vars; see [S3_SETUP.md](./S3_SETUP.md).

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
