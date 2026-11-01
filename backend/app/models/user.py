import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship as orm_relationship
from backend.app.db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), default="User")
    
    # Security PINs
    normal_pin = Column(String(10), default="1234")
    duress_pin = Column(String(10), default="9999")
    
    # Safety Preferences
    check_in_timeout = Column(Integer, default=30) # seconds: 15, 30, 60
    shake_sensitivity = Column(String(20), default="medium") # low, medium, high
    voice_keyword = Column(String(50), default="Help SafeRoute")
    auto_share_trips = Column(Boolean, default=True)
    language = Column(String(10), default="en") # en, hi
    data_retention_days = Column(Integer, default=7) # 1, 7, 30
    expo_push_token = Column(String(200), nullable=True)
    
    # Volunteer Network
    is_volunteer = Column(Boolean, default=False)
    volunteer_available = Column(Boolean, default=False)
    last_lat = Column(Float, nullable=True)
    last_lng = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    contacts = orm_relationship("Contact", back_populates="user", cascade="all, delete-orphan")
    trips = orm_relationship("Trip", back_populates="user", cascade="all, delete-orphan")
    sos_events = orm_relationship("SOSEvent", back_populates="user")


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    relationship = Column(String(50), default="Friend") # Friend, Parent, Spouse, Sibling, Other
    notify_sms = Column(Boolean, default=True)
    notify_whatsapp = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = orm_relationship("User", back_populates="contacts")
