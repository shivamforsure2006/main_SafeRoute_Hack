from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class ContactBase(BaseModel):
    name: str
    phone: str
    relationship: str = "Friend"
    notify_sms: bool = True
    notify_whatsapp: bool = True

class ContactCreate(ContactBase):
    pass

class ContactResponse(ContactBase):
    id: str
    user_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserLoginRequest(BaseModel):
    phone: str
    otp: Optional[str] = "123456" # Mocked OTP for demo

class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    normal_pin: Optional[str] = None
    duress_pin: Optional[str] = None
    check_in_timeout: Optional[int] = None
    shake_sensitivity: Optional[str] = None
    voice_keyword: Optional[str] = None
    auto_share_trips: Optional[bool] = None
    language: Optional[str] = None
    data_retention_days: Optional[int] = None
    expo_push_token: Optional[str] = None
    is_volunteer: Optional[bool] = None
    volunteer_available: Optional[bool] = None
    last_lat: Optional[float] = None
    last_lng: Optional[float] = None

class UserResponse(BaseModel):
    id: str
    phone: str
    name: str
    normal_pin: str
    duress_pin: str
    check_in_timeout: int
    shake_sensitivity: str
    voice_keyword: str
    auto_share_trips: bool
    language: str
    data_retention_days: int
    expo_push_token: Optional[str]
    is_volunteer: bool
    volunteer_available: bool
    contacts: List[ContactResponse] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
