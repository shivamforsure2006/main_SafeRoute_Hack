from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from backend.app.schemas.routing import LatLng, ColoredSegment, WeakestStretch

class BreadcrumbCreate(BaseModel):
    lat: float
    lng: float
    speed: float = 0.0
    battery: int = 100
    accuracy: float = 5.0

class TripStartRequest(BaseModel):
    user_id: str
    origin_name: str
    origin: LatLng
    destination_name: str
    destination: LatLng
    travel_mode: str = "walking"
    route_type: str = "safest"
    planned_route_geometry: List[List[float]]
    planned_duration_s: int
    planned_distance_m: float
    safety_score: float
    battery_level: int = 100

class TripStatusUpdateRequest(BaseModel):
    status: str # "ACTIVE", "CHECK_IN_PENDING", "SOS_ACTIVE", "COMPLETED", "CANCELLED"
    lat: Optional[float] = None
    lng: Optional[float] = None
    speed: Optional[float] = None
    battery_level: Optional[int] = None

class TripResponse(BaseModel):
    id: str
    user_id: str
    status: str
    origin_name: str
    origin_lat: float
    origin_lng: float
    destination_name: str
    destination_lat: float
    destination_lng: float
    travel_mode: str
    route_type: str
    planned_route_geometry: List[List[float]]
    planned_duration_s: int
    planned_distance_m: float
    safety_score: float
    start_time: datetime
    end_time: Optional[datetime]
    tracking_token: str
    token_expires_at: datetime
    battery_level: int
    current_speed: float
    tracking_url: str

    model_config = ConfigDict(from_attributes=True)

class PublicTrackingState(BaseModel):
    trip_id: str
    user_name: str
    status: str # "TRAVELING", "CHECK_IN_PENDING", "SOS_ACTIVE", "ARRIVED_SAFELY"
    current_lat: float
    current_lng: float
    current_speed: float
    battery_level: int
    last_updated: datetime
    planned_route: List[List[float]]
    breadcrumbs_30m: List[List[float]] # [[lat, lng], ...]
    is_sos_active: bool
    sos_audio_url: Optional[str] = None
    sos_photo_url: Optional[str] = None
    eta_seconds_remaining: int
    distance_remaining_m: float
