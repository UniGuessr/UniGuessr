from datetime import datetime
from typing import Optional, Union
from pydantic import BaseModel, Field, field_validator


class Location(BaseModel):
    """Location model representing a campus location."""
    
    id: Optional[str] = Field(None, alias="_id")
    name: str = Field(..., description="Name of the location")
    latitude: float = Field(..., description="Latitude coordinate")
    longitude: float = Field(..., description="Longitude coordinate")
    image_url: str = Field(..., description="URL of the location image")
    difficulty: Optional[str] = Field("medium", description="Difficulty level: easy, medium, hard")
    building_id: Optional[str] = Field(None, description="Building ID if location is inside a building")
    floor: Optional[Union[int, str]] = Field(None, description="Floor number if location is inside a building")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    @field_validator('floor', mode='before')
    @classmethod
    def convert_floor_to_int(cls, v):
        """Convert floor to int if it's a string number. Empty string becomes None."""
        if v is None or v == "":
            return None
        if isinstance(v, str) and v.isdigit():
            return int(v)
        return v
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "name": "Engineering Building",
                "latitude": 43.6532,
                "longitude": -79.3832,
                "image_url": "https://example.com/image.jpg",
                "difficulty": "medium",
                "building_id": "hall_building",
                "floor": 8
            }
        }


class LocationCreate(BaseModel):
    """Schema for creating a new location."""
    
    name: str = Field(..., description="Name of the location")
    latitude: float = Field(..., description="Latitude coordinate")
    longitude: float = Field(..., description="Longitude coordinate")
    image_url: str = Field(..., description="URL of the location image")
    difficulty: Optional[str] = Field("medium", description="Difficulty level: easy, medium, hard")
    building_id: Optional[str] = Field(None, description="Building ID if location is inside a building")
    floor: Optional[Union[int, str]] = Field(None, description="Floor number if location is inside a building")


class LocationResponse(BaseModel):
    """Response schema for location."""
    
    id: str = Field(..., alias="_id")
    name: str
    latitude: float
    longitude: float
    image_url: str
    difficulty: Optional[str] = "medium"
    building_id: Optional[str] = None
    floor: Optional[int] = None
    created_at: datetime
    
    @field_validator('floor', mode='before')
    @classmethod
    def convert_floor_to_int(cls, v):
        """Convert floor to int if it's a string number. Empty string becomes None."""
        if v is None or v == "":
            return None
        if isinstance(v, str) and v.isdigit():
            return int(v)
        return v
    
    class Config:
        populate_by_name = True
