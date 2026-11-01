import secrets
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.config import settings
from backend.app.models.sos import SOSEvent, SOSVolunteerDispatch
from backend.app.models.user import User, Contact
from backend.app.models.trip import Trip
from backend.app.services.osm import haversine_distance
from backend.app.services.notify import notification_service

class SOSService:
    @staticmethod
    def generate_tracking_token() -> str:
        return secrets.token_urlsafe(32)

    async def trigger_sos(
        self,
        db: AsyncSession,
        user_id: str,
        trigger_type: str,
        lat: float,
        lng: float,
        trip_id: Optional[str] = None,
        battery_level: int = 100,
        audio_url: Optional[str] = None,
        photo_url: Optional[str] = None,
        hardware_device_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Execute full SOS broadcast workflow."""
        # Retrieve user
        user_res = await db.execute(select(User).where(User.id == user_id))
        user = user_res.scalar_one_or_none()
        user_name = user.name if user else "SafeRoute User"

        # Determine or create tracking token
        tracking_token = None
        if trip_id:
            trip_res = await db.execute(select(Trip).where(Trip.id == trip_id))
            trip = trip_res.scalar_one_or_none()
            if trip:
                trip.status = "SOS_ACTIVE"
                tracking_token = trip.tracking_token
        
        if not tracking_token:
            tracking_token = self.generate_tracking_token()

        # Create SOS Event
        sos_event = SOSEvent(
            user_id=user_id,
            trip_id=trip_id,
            trigger_type=trigger_type,
            status="ACTIVE",
            lat=lat,
            lng=lng,
            battery_level=battery_level,
            audio_url=audio_url,
            photo_url=photo_url,
            tracking_token=tracking_token,
            hardware_device_id=hardware_device_id,
            created_at=datetime.utcnow()
        )
        db.add(sos_event)
        await db.commit()
        await db.refresh(sos_event)

        tracking_url = f"{settings.PUBLIC_BASE_URL}/track/{tracking_token}"

        # 1. Alert Trusted Contacts
        contacts_res = await db.execute(select(Contact).where(Contact.user_id == user_id))
        contacts = contacts_res.scalars().all()
        notified_contacts_count = 0

        sos_sms_text = (
            f"EMERGENCY ALERT: {user_name} has triggered an SOS alert in Delhi! "
            f"Last location: ({round(lat, 4)}, {round(lng, 4)}). "
            f"Battery: {battery_level}%. "
            f"Live Tracking link: {tracking_url} - Call 112 if unreachable."
        )

        for c in contacts:
            if c.notify_sms:
                await notification_service.send_sms_or_whatsapp(
                    db=db,
                    recipient_phone=c.phone,
                    message=sos_sms_text,
                    channel="SMS",
                    title="EMERGENCY SOS"
                )
                notified_contacts_count += 1
            if c.notify_whatsapp:
                await notification_service.send_sms_or_whatsapp(
                    db=db,
                    recipient_phone=c.phone,
                    message=sos_sms_text,
                    channel="WHATSAPP",
                    title="EMERGENCY SOS"
                )

        # 2. Alert Nearby Active Volunteers within 1000m (1 km)
        volunteers_res = await db.execute(
            select(User).where(
                User.is_volunteer == True,
                User.volunteer_available == True,
                User.id != user_id
            )
        )
        all_volunteers = volunteers_res.scalars().all()
        dispatched_volunteers = []

        for v in all_volunteers:
            if v.last_lat and v.last_lng:
                dist = haversine_distance(lat, lng, v.last_lat, v.last_lng)
                if dist <= 1000.0: # within 1 km
                    dispatch = SOSVolunteerDispatch(
                        sos_event_id=sos_event.id,
                        volunteer_id=v.id,
                        status="NOTIFIED",
                        distance_m=round(dist, 1)
                    )
                    db.add(dispatch)
                    dispatched_volunteers.append({
                        "id": dispatch.id,
                        "volunteer_name": v.name,
                        "status": "NOTIFIED",
                        "distance_m": round(dist, 1)
                    })

                    # Dispatch push to volunteer
                    if v.expo_push_token:
                        await notification_service.send_expo_push(
                            push_token=v.expo_push_token,
                            title="EMERGENCY: Person Needs Help Nearby",
                            body=f"SOS active {round(dist)}m away from you in Delhi. Tap to view location and respond.",
                            data={"sos_event_id": sos_event.id, "tracking_url": tracking_url},
                            priority="high",
                            channel_id="emergency_sos"
                        )
                    else:
                        # Log SMS for volunteer in demo
                        await notification_service.send_sms_or_whatsapp(
                            db=db,
                            recipient_phone=v.phone,
                            message=f"SafeRoute Volunteer Alert: SOS triggered {round(dist)}m away. Map: {tracking_url}",
                            channel="SMS",
                            title="Volunteer SOS Dispatch"
                        )

        await db.commit()

        return {
            "id": sos_event.id,
            "trip_id": trip_id,
            "user_id": user_id,
            "user_name": user_name,
            "trigger_type": trigger_type,
            "status": "ACTIVE",
            "lat": lat,
            "lng": lng,
            "battery_level": battery_level,
            "tracking_token": tracking_token,
            "tracking_url": tracking_url,
            "created_at": sos_event.created_at,
            "contacts_notified_count": notified_contacts_count,
            "volunteers_notified_count": len(dispatched_volunteers),
            "volunteers": dispatched_volunteers
        }

    async def resolve_sos(self, db: AsyncSession, sos_id: str, entered_pin: str) -> Dict[str, Any]:
        """Cancel an SOS event using Normal PIN and notify contacts/volunteers."""
        res = await db.execute(select(SOSEvent).where(SOSEvent.id == sos_id))
        sos_event = res.scalar_one_or_none()
        if not sos_event:
            return {"success": False, "message": "SOS event not found"}

        user_res = await db.execute(select(User).where(User.id == sos_event.user_id))
        user = user_res.scalar_one_or_none()
        if not user or user.normal_pin != entered_pin:
            return {"success": False, "message": "Incorrect PIN. Cannot cancel alert."}

        sos_event.status = "RESOLVED_SAFE"
        sos_event.resolved_at = datetime.utcnow()

        if sos_event.trip_id:
            trip_res = await db.execute(select(Trip).where(Trip.id == sos_event.trip_id))
            trip = trip_res.scalar_one_or_none()
            if trip:
                trip.status = "ACTIVE"

        await db.commit()

        # Broadcast "I'm Safe" cancellation
        safe_msg = f"UPDATE from SafeRoute: {user.name} has entered their PIN and confirmed they are SAFE. Emergency alert resolved."
        contacts_res = await db.execute(select(Contact).where(Contact.user_id == user.id))
        for c in contacts_res.scalars().all():
            await notification_service.send_sms_or_whatsapp(db, c.phone, safe_msg, "SMS", "SafeRoute Update")

        return {"success": True, "message": "SOS cancelled successfully. Contacts notified that you are safe."}

    async def volunteer_respond(self, db: AsyncSession, dispatch_id: str, response_status: str = "ON_MY_WAY") -> Dict[str, Any]:
        """Handle volunteer 'On my way' response."""
        res = await db.execute(select(SOSVolunteerDispatch).where(SOSVolunteerDispatch.id == dispatch_id))
        disp = res.scalar_one_or_none()
        if not disp:
            return {"success": False, "message": "Dispatch not found"}

        disp.status = response_status
        disp.responded_at = datetime.utcnow()
        await db.commit()

        # Notify the user that help is en route
        sos_res = await db.execute(select(SOSEvent).where(SOSEvent.id == disp.sos_event_id))
        sos = sos_res.scalar_one_or_none()
        if sos:
            vol_res = await db.execute(select(User).where(User.id == disp.volunteer_id))
            vol = vol_res.scalar_one_or_none()
            vol_name = vol.name if vol else "A nearby volunteer"
            
            user_res = await db.execute(select(User).where(User.id == sos.user_id))
            target_user = user_res.scalar_one_or_none()
            if target_user and target_user.expo_push_token:
                await notification_service.send_expo_push(
                    push_token=target_user.expo_push_token,
                    title="Help Is On The Way",
                    body=f"{vol_name} has responded to your SOS and is heading to your location.",
                    channel_id="emergency_sos"
                )

        return {"success": True, "status": response_status}

sos_service = SOSService()
