"""application settings loaded from app/config/.env.{env} and .secrets.{env}."""

import os

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from app import CONFIG_PATH

APP_ENV = os.getenv("APP_ENV", "development")
ENV_FILE = CONFIG_PATH / "env" / f".env.{APP_ENV}"
SECRETS_FILE = CONFIG_PATH / "secrets" / f".secrets.{APP_ENV}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(ENV_FILE), str(SECRETS_FILE)),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_env: str = Field(default="development")
    database_url: str = Field(..., alias="DATABASE_URL")

    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000)
    debug: bool = Field(default=True)
    cors_origins: list[str] = Field(validation_alias="CORS_ORIGINS")

    # aws
    aws_access_key_id: str = Field(default="")
    aws_secret_access_key: str = Field(default="")
    aws_region: str = Field(default="")
    s3_bucket_name: str = Field(default="")
    s3_base_url: str = Field(default="")


settings = Settings()
