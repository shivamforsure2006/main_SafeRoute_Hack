from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class LatLng(BaseModel):
    lat: float
    lng: float

class RouteScoreBreakdown(BaseModel):
    lighting: float = Field(..., description="Lighting score 0-100")
    activity: float = Field(..., description="Open shops & footfall 0-100")
    help_density: float = Field(..., description="Nearby police, hospitals 0-100")
    incident_penalty: float = Field(..., description="Deduction from community reports 0-100")
    night_multiplier: float = 1.0

class WeakestStretch(BaseModel):
    start_index: int
    end_index: int
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    score: float
    reason: str

class ColoredSegment(BaseModel):
    coordinates: List[List[float]] # [[lat, lng], [lat, lng]]
    score: float
    category: str # "safe" (>=75), "caution" (50-74), "danger" (<50)

class RouteAlternative(BaseModel):
    id: str # "safest", "fastest", "balanced"
    title: str # "Safest Route", "Fastest Route", "Balanced Route"
    distance_m: float
    duration_s: int
    safety_score: float # 0-100
    one_line_reason: str
    geometry: List[List[float]] # [[lat, lng], ...]
    segments: List[ColoredSegment]
    weakest_stretch: Optional[WeakestStretch] = None
    breakdown: RouteScoreBreakdown

class RoutePlanRequest(BaseModel):
    origin: LatLng
    destination: LatLng
    mode: str = "walking" # "walking", "driving"
    is_night_preview: bool = False

class RoutePlanResponse(BaseModel):
    origin_name: str
    destination_name: str
    routes: List[RouteAlternative]
    cached_layers: Optional[Dict[str, Any]] = None
