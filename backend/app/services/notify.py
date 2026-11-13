import asyncio
import httpx
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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
        self.fast2sms_key = settings.FAST2SMS_API_KEY
        
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_from = settings.SMTP_FROM_EMAIL or settings.SMTP_USER or "alerts@saferoute-delhi.com"
        self.resend_key = settings.RESEND_API_KEY

    async def send_sms_or_whatsapp(
        self,
        db: AsyncSession,
        recipient_phone: str,
        message: str,
        channel: str = "SMS",
        title: str = "SafeRoute Alert"
    ) -> Dict[str, Any]:
        """Dispatch SMS/WhatsApp via Twilio, Fast2SMS, or in-memory Mock logger."""
        has_sms_provider = bool((self.twilio_sid and self.twilio_token) or self.fast2sms_key)
        
        msg_record = MessageLog(
            recipient_phone=recipient_phone,
            channel=channel,
            title=title,
            content=message,
            status="MOCKED" if self.mock_mode or not has_sms_provider else "PENDING",
            created_at=datetime.utcnow()
        )
        db.add(msg_record)
        await db.commit()
        await db.refresh(msg_record)

        if not self.mock_mode:
            # 1. Try Fast2SMS (Free / Low Cost Indian SMS Gateway)
            if self.fast2sms_key and channel == "SMS":
                try:
                    # Clean digits
                    clean_phone = "".join(filter(str.isdigit, recipient_phone))
                    if clean_phone.startswith("91") and len(clean_phone) == 12:
                        clean_phone = clean_phone[2:]
                        
                    async with httpx.AsyncClient(timeout=8.0) as client:
                        resp = await client.post(
                            "https://www.fast2sms.com/dev/bulkV2",
                            headers={"authorization": self.fast2sms_key},
                            data={
                                "route": "q",
                                "message": message,
                                "language": "english",
                                "flash": 0,
                                "numbers": clean_phone
                            }
                        )
                        if resp.status_code == 200 and resp.json().get("return"):
                            msg_record.status = "SENT"
                        else:
                            msg_record.status = "FAILED"
                            msg_record.error_message = resp.text
                        await db.commit()
                except Exception as e:
                    msg_record.status = "FAILED"
                    msg_record.error_message = str(e)
                    await db.commit()

            # 2. Try Twilio API (Global SMS & WhatsApp)
            elif self.twilio_sid and self.twilio_token:
                try:
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

    async def send_email(
        self,
        db: AsyncSession,
        recipient_email: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None
    ) -> Dict[str, Any]:
        """Dispatch Emergency SOS Email via Free Gmail SMTP or Resend API."""
        has_email_provider = bool(self.resend_key or (self.smtp_user and self.smtp_password))
        
        msg_record = MessageLog(
            recipient_phone=recipient_email,
            channel="EMAIL",
            title=subject,
            content=body_text,
            status="MOCKED" if self.mock_mode or not has_email_provider else "PENDING",
            created_at=datetime.utcnow()
        )
        db.add(msg_record)
        await db.commit()
        await db.refresh(msg_record)

        if not self.mock_mode:
            # Option A: Resend API (Free 3,000 emails/month)
            if self.resend_key:
                try:
                    async with httpx.AsyncClient(timeout=8.0) as client:
                        resp = await client.post(
                            "https://api.resend.com/emails",
                            headers={"Authorization": f"Bearer {self.resend_key}"},
                            json={
                                "from": self.smtp_from or "SafeRoute Delhi <alerts@resend.dev>",
                                "to": [recipient_email],
                                "subject": subject,
                                "text": body_text,
                                "html": body_html or f"<pre>{body_text}</pre>"
                            }
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

            # Option B: Free Gmail / Standard SMTP (Zero-cost via Gmail App Password)
            elif self.smtp_user and self.smtp_password:
                def _send_smtp_sync():
                    msg = MIMEMultipart("alternative")
                    msg["Subject"] = subject
                    msg["From"] = self.smtp_from
                    msg["To"] = recipient_email
                    msg.attach(MIMEText(body_text, "plain"))
                    if body_html:
                        msg.attach(MIMEText(body_html, "html"))

                    with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                        server.starttls()
                        server.login(self.smtp_user, self.smtp_password)
                        server.sendmail(self.smtp_from, [recipient_email], msg.as_string())

                try:
                    await asyncio.to_thread(_send_smtp_sync)
                    msg_record.status = "SENT"
                    await db.commit()
                except Exception as e:
                    msg_record.status = "FAILED"
                    msg_record.error_message = str(e)
                    await db.commit()

        print(f"[EMAIL to {recipient_email}] {subject}: {body_text[:100]}...")
        return {"id": msg_record.id, "status": msg_record.status, "recipient": recipient_email}

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
