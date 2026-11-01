import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.db import Base

class SOSEvent(Base):
    __tablename__ = "sos_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    trigger_type = Column(String(40), nullable=False) # BUTTON_HOLD, SHAKE, VOICE, CHECK_IN_TIMEOUT, DURESS_PIN, HARDWARE
    status = Column(String(30), default="ACTIVE", index=True) # ACTIVE, RESOLVED_SAFE, DISMISSED
    
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    battery_level = Column(Integer, default=100)
    
    audio_url = Column(String(500), nullable=True)
    photo_url = Column(String(500), nullable=True)
    
    tracking_token = Column(String(64), index=True, nullable=False)
    hardware_device_id = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="sos_events")
    trip = relationship("Trip", back_populates="sos_events")
    dispatches = relationship("SOSVolunteerDispatch", back_populates="sos_event", cascade="all, delete-orphan")


class SOSVolunteerDispatch(Base):
    __tablename__ = "sos_volunteer_dispatches"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sos_event_id = Column(String(36), ForeignKey("sos_events.id", ondelete="CASCADE"), nullable=False, index=True)
    volunteer_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    status = Column(String(30), default="NOTIFIED") # NOTIFIED, ON_MY_WAY, DECLINED, ARRIVED
    distance_m = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)

    sos_event = relationship("SOSEvent", back_populates="dispatches")
