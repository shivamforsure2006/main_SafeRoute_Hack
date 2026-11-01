import httpx
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.config import settings
from backend.app.models.message import MessageLog

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

class NotificationService:
    def __init__(self):
        self.mock_mode = settings.MOCK_SMS
        self.twilio_sid = settings.TWILIO_ACCOUNT_SID
        self.twilio_token = settings.TWILIO_AUTH_TOKEN
        self.twilio_phone = settings.TWILIO_FROM_PHONE

    async def send_sms_or_whatsapp(
        self,
        db: AsyncSession,
        recipient_phone: str,
        message: str,
        channel: str = "SMS",
        title: str = "SafeRoute Alert"
    ) -> Dict[str, Any]:
        """Dispatch SMS/WhatsApp via Twilio or in-memory Mock logger."""
        # Always log to database MessageLog for in-app verification & admin
        msg_record = MessageLog(
            recipient_phone=recipient_phone,
            channel=channel,
            title=title,
            content=message,
            status="MOCKED" if self.mock_mode or not self.twilio_sid else "PENDING",
            created_at=datetime.utcnow()
        )
        db.add(msg_record)
        await db.commit()
        await db.refresh(msg_record)

        if not self.mock_mode and self.twilio_sid and self.twilio_token:
            try:
                # Real Twilio API Call
                twilio_url = f"https://api.twilio.com/2010-04-01/Accounts/{self.twilio_sid}/Messages.json"
                from_num = f"whatsapp:{self.twilio_phone}" if channel == "WHATSAPP" else self.twilio_phone
                to_num = f"whatsapp:{recipient_phone}" if channel == "WHATSAPP" else recipient_phone
                
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.post(
                        twilio_url,
                        auth=(self.twilio_sid, self.twilio_token),
                        data={"From": from_num, "To": to_num, "Body": message}
                    )
                    if resp.status_code in (200, 201):
                        msg_record.status = "SENT"
                    else:
                        msg_record.status = "FAILED"
                        msg_record.error_message = resp.text
                    await db.commit()
            except Exception as e:
                msg_record.status = "FAILED"
                msg_record.error_message = str(e)
                await db.commit()

        print(f"[{channel} to {recipient_phone}] {title}: {message}")
        return {"id": msg_record.id, "status": msg_record.status, "recipient": recipient_phone}

    async def send_expo_push(
        self,
        push_token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        priority: str = "high",
        channel_id: str = "emergency_sos"
    ) -> bool:
        """Send high-priority push notification via Expo Push Notification service."""
        if not push_token or not push_token.startswith("ExponentPushToken"):
            # Mock / local push log
            print(f"[Push to {push_token or 'Device'}] {title}: {body}")
            return True

        payload = {
            "to": push_token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {},
            "priority": priority,
            "channelId": channel_id
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(EXPO_PUSH_URL, json=payload)
                return res.status_code == 200
        except Exception as e:
            print(f"Expo push notification error: {e}")
            return False

notification_service = NotificationService()
