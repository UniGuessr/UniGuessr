"""pydantic schemas for university request and response payloads."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class UniversityCreate(BaseModel):
    name: str


class UniversityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    created_at: datetime

    @field_validator("id", mode="before")
    @classmethod
    def coerce_id(cls, v):
        return str(v)
