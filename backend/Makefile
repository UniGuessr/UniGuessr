APP_ENV ?= development

.PHONY: run run-prod install migrate migrate-down migrate-create migrate-status test-connection shell

dev:
	uv run uvicorn main:app --reload --host 127.0.0.1 --port 8000

run:
	uv run uvicorn main:app --host 127.0.0.1 --port 8000

check:
	uv run python -m compileall -q main.py src

install:
	uv sync

migrate:
	APP_ENV=$(APP_ENV) uv run alembic upgrade head

migrate-down:
	APP_ENV=$(APP_ENV) uv run alembic downgrade -1

# usage: make migrate-create name="add_something"
migrate-create:
	APP_ENV=$(APP_ENV) uv run alembic revision --autogenerate -m "$(name)"

migrate-status:
	APP_ENV=$(APP_ENV) uv run alembic current

test-connection:
	APP_ENV=$(APP_ENV) uv run python scripts/test_db.py

shell:
	APP_ENV=$(APP_ENV) uv run python
