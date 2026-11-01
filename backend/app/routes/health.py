from fastapi import APIRouter
from backend.app.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "demo_mode": settings.DEMO_MODE,
        "mock_sms": settings.MOCK_SMS,
        "delhi_center": [settings.DELHI_CENTER_LAT, settings.DELHI_CENTER_LNG]
    }
