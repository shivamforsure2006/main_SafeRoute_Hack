import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "SafeRoute Delhi Backend"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEMO_MODE: bool = True
    MOCK_SMS: bool = True
    
    # Database
    USE_LOCAL_DB: bool = True
    DATABASE_URL: str = "sqlite+aiosqlite:///./saferoute.db"
    SYNC_DATABASE_URL: str = "sqlite:///./saferoute.db"
    
    # Security & Tokens
    SECRET_KEY: str = "saferoute-delhi-secret-key-2026-hackathon"
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "SafeDelhi2026")
    TRACKING_TOKEN_EXPIRE_HOURS: int = 2
    
    # Delhi Coordinates & Boundaries
    DELHI_CENTER_LAT: float = 28.6139
    DELHI_CENTER_LNG: float = 77.2090
    DELHI_BBOX: tuple[float, float, float, float] = (28.40, 76.85, 28.88, 77.40) # min_lat, min_lon, max_lat, max_lon
    
    # External APIs (Optional - fallbacks provided)
    ORS_API_KEY: Optional[str] = os.getenv("ORS_API_KEY", None)
    
    # SMS: Twilio (Free trial credit) or Fast2SMS (Free trial wallet in India)
    TWILIO_ACCOUNT_SID: Optional[str] = os.getenv("TWILIO_ACCOUNT_SID", None)
    TWILIO_AUTH_TOKEN: Optional[str] = os.getenv("TWILIO_AUTH_TOKEN", None)
    TWILIO_FROM_PHONE: Optional[str] = os.getenv("TWILIO_FROM_PHONE", "+1234567890")
    FAST2SMS_API_KEY: Optional[str] = os.getenv("FAST2SMS_API_KEY", None)
    
    # Email: Free Gmail SMTP (App Password) or Resend (Free 3000 emails/month)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: Optional[str] = os.getenv("SMTP_USER", None)
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD", None) # Gmail App Password
    SMTP_FROM_EMAIL: Optional[str] = os.getenv("SMTP_FROM_EMAIL", None)
    RESEND_API_KEY: Optional[str] = os.getenv("RESEND_API_KEY", None)
    
    # Safety Engine Weights (Required in one config)
    WEIGHT_LIGHTING: float = 0.30
    WEIGHT_ACTIVITY: float = 0.25
    WEIGHT_HELP: float = 0.20
    WEIGHT_INCIDENT: float = 0.25
    NIGHT_MULTIPLIER: float = 0.70
    SEGMENT_SAMPLE_DIST_M: float = 50.0
    
    # Anomaly Detection Thresholds
    DEVIATION_THRESHOLD_M: float = 150.0
    STOP_THRESHOLD_S: float = 180.0
    SPEED_SPIKE_WALK_MAX: float = 1.8    # m/s
    SPEED_SPIKE_VEHICLE_MIN: float = 8.0  # m/s
    FALL_SPIKE_ACCEL: float = 24.0        # m/s^2
    MISSED_ETA_THRESHOLD_S: float = 600.0 # 10 mins
    
    # Base URL for public tracking
    PUBLIC_BASE_URL: str = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

settings = Settings()
