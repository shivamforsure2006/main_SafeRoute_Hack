import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.db import Base

class IncidentReport(Base):
    __tablename__ = "incident_reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    category = Column(String(50), nullable=False) # poor_lighting, harassment, isolated_area, unsafe_crowd, stray_animals, road_hazard, other
    severity = Column(Integer, default=2) # 1: Low, 2: Medium, 3: High
    
    lat = Column(Float, nullable=False, index=True)
    lng = Column(Float, nullable=False, index=True)
    address_label = Column(String(200), nullable=True)
    description = Column(Text, default="")
    
    is_anonymous = Column(Boolean, default=False)
    confirmations_count = Column(Integer, default=1)
    flags_count = Column(Integer, default=0)
    is_hidden = Column(Boolean, default=False, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    confirmations = relationship("ReportConfirmation", back_populates="report", cascade="all, delete-orphan")


class ReportConfirmation(Base):
    __tablename__ = "report_confirmations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id = Column(String(36), ForeignKey("incident_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("IncidentReport", back_populates="confirmations")
