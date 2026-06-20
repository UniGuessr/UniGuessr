APP_ENV ?= development

.PHONY: run run-prod install migrate migrate-down migrate-create migrate-status test-connection shell

run:
	APP_ENV=development uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload

run-prod:
	APP_ENV=production uv run uvicorn main:app --host 0.0.0.0 --port 8000

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
