from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class Location(BaseModel):
    """Location model representing a campus location."""
    
    id: Optional[str] = Field(None, alias="_id")
    name: str = Field(..., description="Name of the location")
    latitude: float = Field(..., description="Latitude coordinate")
    longitude: float = Field(..., description="Longitude coordinate")
    image_url: str = Field(..., description="URL of the location image")
    difficulty: Optional[str] = Field("medium", description="Difficulty level: easy, medium, hard")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "name": "Engineering Building",
                "latitude": 43.6532,
                "longitude": -79.3832,
                "image_url": "https://example.com/image.jpg",
                "difficulty": "medium"
            }
        }


class LocationCreate(BaseModel):
    """Schema for creating a new location."""
    
    name: str = Field(..., description="Name of the location")
    latitude: float = Field(..., description="Latitude coordinate")
    longitude: float = Field(..., description="Longitude coordinate")
    image_url: str = Field(..., description="URL of the location image")
    difficulty: Optional[str] = Field("medium", description="Difficulty level: easy, medium, hard")


class LocationResponse(BaseModel):
    """Response schema for location."""
    
    id: str = Field(..., alias="_id")
    name: str
    latitude: float
    longitude: float
    image_url: str
    difficulty: Optional[str] = "medium"
    created_at: datetime
    
    class Config:
        populate_by_name = True
