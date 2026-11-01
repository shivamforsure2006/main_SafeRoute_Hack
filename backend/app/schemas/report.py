from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class IncidentReportCreate(BaseModel):
    category: str = Field(..., description="poor_lighting, harassment, isolated_area, unsafe_crowd, stray_animals, road_hazard, other")
    severity: int = Field(2, ge=1, le=3, description="1: Low, 2: Medium, 3: High")
    lat: float
    lng: float
    address_label: Optional[str] = None
    description: Optional[str] = ""
    is_anonymous: bool = False
    user_id: Optional[str] = None

class IncidentReportResponse(BaseModel):
    id: str
    category: str
    severity: int
    lat: float
    lng: float
    address_label: Optional[str]
    description: str
    is_anonymous: bool
    confirmations_count: int
    flags_count: int
    is_hidden: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class HeatmapPoint(BaseModel):
    lat: float
    lng: float
    weight: float
    category: str
    severity: int
