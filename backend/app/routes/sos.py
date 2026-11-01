from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from backend.app.db import get_db
from backend.app.config import settings
from backend.app.models.sos import SOSEvent, SOSVolunteerDispatch
from backend.app.models.user import User
from backend.app.schemas.sos import SOSTriggerRequest, HardwareSOSRequest, SOSCancelRequest, SOSResponse
from backend.app.services.sos import sos_service
from backend.app.routes.tracking import ws_manager

router = APIRouter(prefix="/api/sos", tags=["Emergency SOS"])

@router.post("/trigger", response_model=SOSResponse)
async def trigger_sos_endpoint(payload: SOSTriggerRequest, db: AsyncSession = Depends(get_db)):
    """Trigger multi-channel SOS alert from app (Hold, Shake, Voice, Timeout, Duress)."""
    sos_data = await sos_service.trigger_sos(
        db=db,
        user_id=payload.user_id,
        trigger_type=payload.trigger_type,
        lat=payload.lat,
        lng=payload.lng,
        trip_id=payload.trip_id,
        battery_level=payload.battery_level
    )
    
    # Broadcast SOS event to WebSocket subscribers
    await ws_manager.broadcast(sos_data["tracking_token"], {
        "type": "SOS_TRIGGERED",
        "status": "SOS_ACTIVE",
        "lat": payload.lat,
        "lng": payload.lng,
        "trigger_type": payload.trigger_type
    })
    
    return sos_data

@router.post("/cancel/{sos_id}")
async def cancel_sos_endpoint(sos_id: str, payload: SOSCancelRequest, db: AsyncSession = Depends(get_db)):
    """Cancel SOS with user's normal PIN and notify all contacts/volunteers."""
    res = await sos_service.resolve_sos(db, sos_id, payload.pin)
    if not res["success"]:
        raise HTTPException(status_code=400, detail=res["message"])
        
    # Broadcast safe resolution to WebSocket
    sos_res = await db.execute(select(SOSEvent).where(SOSEvent.id == sos_id))
    sos = sos_res.scalar_one_or_none()
    if sos:
        await ws_manager.broadcast(sos.tracking_token, {
            "type": "SOS_RESOLVED",
            "status": "RESOLVED_SAFE"
        })

    return res

@router.post("/hardware")
async def hardware_sos_endpoint(
    payload: HardwareSOSRequest,
    x_api_key: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Physical IoT ESP32 Emergency Button endpoint.
    Accepts POST from ESP32 with device_id, lat/lng, and optional API key header.
    """
    # Find user associated with hardware device or default demo user
    user_res = await db.execute(select(User).limit(1))
    user = user_res.scalar_one_or_none()
    user_id = user.id if user else "demo-hardware-user"

    lat = payload.lat or settings.DELHI_CENTER_LAT
    lng = payload.lng or settings.DELHI_CENTER_LNG

    sos_data = await sos_service.trigger_sos(
        db=db,
        user_id=user_id,
        trigger_type="HARDWARE",
        lat=lat,
        lng=lng,
        battery_level=payload.battery_level or 100,
        hardware_device_id=payload.device_id
    )

    return {
        "success": True,
        "device_id": payload.device_id,
        "sos_event_id": sos_data["id"],
        "tracking_url": sos_data["tracking_url"],
        "message": "Hardware SOS triggered successfully"
    }

@router.get("/active")
async def get_active_sos_events(db: AsyncSession = Depends(get_db)):
    """Fetch active SOS events for volunteer radar and admin dashboard."""
    res = await db.execute(select(SOSEvent).where(SOSEvent.status == "ACTIVE"))
    events = res.scalars().all()
    results = []
    for e in events:
        user_res = await db.execute(select(User).where(User.id == e.user_id))
        user = user_res.scalar_one_or_none()
        results.append({
            "id": e.id,
            "user_id": e.user_id,
            "user_name": user.name if user else "User",
            "trigger_type": e.trigger_type,
            "lat": e.lat,
            "lng": e.lng,
            "battery_level": e.battery_level,
            "tracking_url": f"{settings.PUBLIC_BASE_URL}/track/{e.tracking_token}",
            "created_at": e.created_at
        })
    return results

@router.post("/dispatch/{dispatch_id}/respond")
async def volunteer_respond_endpoint(dispatch_id: str, db: AsyncSession = Depends(get_db)):
    """Volunteer marks 'On my way' to assist the user."""
    res = await sos_service.volunteer_respond(db, dispatch_id, "ON_MY_WAY")
    if not res["success"]:
        raise HTTPException(status_code=400, detail=res["message"])
    return res
