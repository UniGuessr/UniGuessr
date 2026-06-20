"""pydantic schemas for location request and response payloads."""

from datetime import datetime
from typing import Optional, Union

from pydantic import BaseModel, ConfigDict, field_validator


class LocationCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    image_url: str
    difficulty: Optional[str] = "medium"
    building_id: Optional[str] = None
    floor: Optional[Union[int, str]] = None
    university: Optional[str] = None


class LocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    latitude: float
    longitude: float
    image_url: str
    difficulty: Optional[str] = "medium"
    building_id: Optional[str] = None
    floor: Optional[int] = None
    university: Optional[str] = None
    created_at: datetime

    @field_validator("id", mode="before")
    @classmethod
    def coerce_id(cls, v):
        return str(v)

    @field_validator("floor", mode="before")
    @classmethod
    def convert_floor(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str) and v.isdigit():
            return int(v)
        return v
