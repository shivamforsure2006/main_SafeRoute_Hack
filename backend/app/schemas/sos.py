from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class SOSTriggerRequest(BaseModel):
    user_id: str
    trip_id: Optional[str] = None
    trigger_type: str # BUTTON_HOLD, SHAKE, VOICE, CHECK_IN_TIMEOUT, DURESS_PIN, HARDWARE
    lat: float
    lng: float
    battery_level: int = 100
    audio_base64: Optional[str] = None
    photo_base64: Optional[str] = None

class HardwareSOSRequest(BaseModel):
    device_id: str
    lat: Optional[float] = 28.6139
    lng: Optional[float] = 77.2090
    battery_level: Optional[int] = 100

class SOSCancelRequest(BaseModel):
    pin: str

class VolunteerDispatchResponse(BaseModel):
    id: str
    volunteer_name: str
    status: str
    distance_m: float

class SOSResponse(BaseModel):
    id: str
    trip_id: Optional[str]
    user_id: str
    user_name: str
    trigger_type: str
    status: str
    lat: float
    lng: float
    battery_level: int
    tracking_token: str
    tracking_url: str
    created_at: datetime
    contacts_notified_count: int
    volunteers_notified_count: int
    volunteers: List[VolunteerDispatchResponse] = []

    model_config = ConfigDict(from_attributes=True)
