import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from backend.app.db import Base

class MessageLog(Base):
    __tablename__ = "message_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    recipient_phone = Column(String(30), nullable=False, index=True)
    channel = Column(String(20), default="SMS") # SMS, WHATSAPP, PUSH
    title = Column(String(100), default="Alert")
    content = Column(Text, nullable=False)
    status = Column(String(20), default="MOCKED") # SENT, MOCKED, FAILED
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
