import os
from pathlib import Path
from typing import Optional

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
APP_ENV = os.getenv("APP_ENV", "development")
ENV_FILE = BACKEND_DIR / f".env.{APP_ENV}"
SECRETS_FILE = BACKEND_DIR / f".secrets.{APP_ENV}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(ENV_FILE), str(SECRETS_FILE)),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_env: str = Field(default="development")

    # Optional direct URL override (paste from Supabase dashboard)
    # Takes precedence over individual db_* fields when set.
    database_url_override: Optional[str] = Field(default=None, alias="DATABASE_URL")

    db_host: str = Field(default="")
    db_port: int = Field(default=5432)
    db_name: str = Field(default="postgres")
    db_user: str = Field(default="postgres")
    db_password: str = Field(default="")

    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000)
    debug: bool = Field(default=True)

    aws_access_key_id: str = Field(default="")
    aws_secret_access_key: str = Field(default="")
    aws_region: str = Field(default="")
    s3_bucket_name: str = Field(default="")
    s3_base_url: str = Field(default="")

    @computed_field
    @property
    def database_url(self) -> str:
        if self.database_url_override:
            url = self.database_url_override
            # Normalise scheme to asyncpg driver
            for prefix in ("postgres://", "postgresql://"):
                if url.startswith(prefix):
                    url = "postgresql+asyncpg://" + url[len(prefix):]
                    break
            return url
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


settings = Settings()
