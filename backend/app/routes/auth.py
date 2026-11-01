from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List
from backend.app.db import get_db
from backend.app.models.user import User, Contact
from backend.app.schemas.user import UserLoginRequest, UserUpdateRequest, UserResponse, ContactCreate, ContactResponse
from backend.app.services.notify import notification_service

router = APIRouter(prefix="/api", tags=["Auth & Profile"])

@router.post("/auth/login", response_model=UserResponse)
async def login_or_register(payload: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    """Mock OTP login or auto-registration for Delhi demo."""
    phone = payload.phone.strip()
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(
            phone=phone,
            name="Delhi Commuter",
            normal_pin="1234",
            duress_pin="9999",
            language="en"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        # Seed 2 default demo contacts
        c1 = Contact(user_id=user.id, name="Mom", phone="+919811122233", relationship="Parent")
        c2 = Contact(user_id=user.id, name="Priya (Sister)", phone="+919877788899", relationship="Sibling")
        db.add_all([c1, c2])
        await db.commit()
        await db.refresh(user)

    # Reload contacts
    c_res = await db.execute(select(Contact).where(Contact.user_id == user.id))
    user.contacts = c_res.scalars().all()
    return user

@router.get("/user/me", response_model=UserResponse)
async def get_current_user(phone: str = "+919810012345", db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if not user:
        # Create default demo user
        return await login_or_register(UserLoginRequest(phone=phone), db)
    c_res = await db.execute(select(Contact).where(Contact.user_id == user.id))
    user.contacts = c_res.scalars().all()
    return user

@router.put("/user/settings", response_model=UserResponse)
async def update_user_settings(payload: UserUpdateRequest, user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(user, field, val)
        
    await db.commit()
    await db.refresh(user)
    c_res = await db.execute(select(Contact).where(Contact.user_id == user.id))
    user.contacts = c_res.scalars().all()
    return user

@router.post("/contacts", response_model=ContactResponse)
async def add_contact(user_id: str, payload: ContactCreate, db: AsyncSession = Depends(get_db)):
    # Check limit of 5 contacts
    count_res = await db.execute(select(Contact).where(Contact.user_id == user_id))
    current_count = len(count_res.scalars().all())
    if current_count >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 trusted contacts allowed")
        
    contact = Contact(
        user_id=user_id,
        name=payload.name,
        phone=payload.phone,
        relationship=payload.relationship,
        notify_sms=payload.notify_sms,
        notify_whatsapp=payload.notify_whatsapp
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact

@router.delete("/contacts/{contact_id}")
async def remove_contact(contact_id: str, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(Contact).where(Contact.id == contact_id))
    await db.commit()
    return {"success": True, "message": "Contact removed"}

@router.post("/contacts/{contact_id}/test-message")
async def send_test_message(contact_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = res.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    user_res = await db.execute(select(User).where(User.id == contact.user_id))
    user = user_res.scalar_one_or_none()
    user_name = user.name if user else "Your friend"
    
    test_msg = f"SafeRoute Test: {user_name} added you as an emergency contact in Delhi. In an emergency, you will receive real-time location alerts."
    sent_res = await notification_service.send_sms_or_whatsapp(db, contact.phone, test_msg, "SMS", "SafeRoute Contact Verification")
    return {"success": True, "details": sent_res}

@router.delete("/user/{user_id}/data")
async def delete_user_data(user_id: str, db: AsyncSession = Depends(get_db)):
    """Delete all user personal data per retention & privacy settings."""
    await db.execute(delete(User).where(User.id == user_id))
    await db.commit()
    return {"success": True, "message": "All user data permanently deleted"}
