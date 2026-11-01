import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.db import Base

class Trip(Base):
    __tablename__ = "trips"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(30), default="PLANNING", index=True) # PLANNING, ACTIVE, CHECK_IN_PENDING, SOS_ACTIVE, COMPLETED, CANCELLED
    
    origin_name = Column(String(200), default="Origin")
    origin_lat = Column(Float, nullable=False)
    origin_lng = Column(Float, nullable=False)
    
    destination_name = Column(String(200), default="Destination")
    destination_lat = Column(Float, nullable=False)
    destination_lng = Column(Float, nullable=False)
    
    travel_mode = Column(String(20), default="walking") # walking, driving
    route_type = Column(String(20), default="safest")  # safest, fastest, balanced
    
    planned_route_geometry = Column(Text, nullable=False) # JSON encoded list of [lat, lng]
    planned_duration_s = Column(Integer, default=0)
    planned_distance_m = Column(Float, default=0.0)
    safety_score = Column(Float, default=85.0)
    
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    
    # Public tracking token
    tracking_token = Column(String(64), unique=True, index=True, nullable=False)
    token_expires_at = Column(DateTime, nullable=False)
    is_token_revoked = Column(Boolean, default=False)
    battery_level = Column(Integer, default=100)
    current_speed = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="trips")
    breadcrumbs = relationship("LocationBreadcrumb", back_populates="trip", cascade="all, delete-orphan", order_by="LocationBreadcrumb.created_at")
    sos_events = relationship("SOSEvent", back_populates="trip")


class LocationBreadcrumb(Base):
    __tablename__ = "location_breadcrumbs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    speed = Column(Float, default=0.0)
    battery = Column(Integer, default=100)
    accuracy = Column(Float, default=5.0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    trip = relationship("Trip", back_populates="breadcrumbs")
