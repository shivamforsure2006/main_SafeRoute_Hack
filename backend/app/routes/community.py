from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Optional
from datetime import datetime
from backend.app.db import get_db
from backend.app.models.report import IncidentReport, ReportConfirmation
from backend.app.models.user import User
from backend.app.schemas.report import IncidentReportCreate, IncidentReportResponse, HeatmapPoint

router = APIRouter(prefix="/api", tags=["Community & Hazards"])

@router.post("/reports", response_model=IncidentReportResponse)
async def submit_hazard_report(payload: IncidentReportCreate, db: AsyncSession = Depends(get_db)):
    """
    Submit an unsafe spot report (poor lighting, harassment, isolated area, etc.).
    Immediately updates subsequent safety scoring computations.
    """
    report = IncidentReport(
        user_id=payload.user_id,
        category=payload.category,
        severity=payload.severity,
        lat=payload.lat,
        lng=payload.lng,
        address_label=payload.address_label or "Delhi NCR",
        description=payload.description or "",
        is_anonymous=payload.is_anonymous,
        confirmations_count=1,
        flags_count=0,
        is_hidden=False,
        created_at=datetime.utcnow()
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report

@router.get("/reports", response_model=List[IncidentReportResponse])
async def list_hazard_reports(category: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """List verified and visible incident reports."""
    stmt = select(IncidentReport).where(IncidentReport.is_hidden == False).order_by(IncidentReport.created_at.desc())
    if category:
        stmt = stmt.where(IncidentReport.category == category)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/reports/{report_id}/confirm")
async def confirm_hazard_report(report_id: str, user_id: str = "demo-user", db: AsyncSession = Depends(get_db)):
    """'I have seen this too' community confirmation."""
    res = await db.execute(select(IncidentReport).where(IncidentReport.id == report_id))
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.confirmations_count += 1
    conf = ReportConfirmation(report_id=report_id, user_id=user_id)
    db.add(conf)
    await db.commit()
    return {"success": True, "confirmations_count": report.confirmations_count}

@router.post("/reports/{report_id}/flag")
async def flag_hazard_report(report_id: str, db: AsyncSession = Depends(get_db)):
    """Flag inappropriate report. Automatically hides report once 3 flags are reached."""
    res = await db.execute(select(IncidentReport).where(IncidentReport.id == report_id))
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.flags_count += 1
    if report.flags_count >= 3:
        report.is_hidden = True

    await db.commit()
    return {
        "success": True,
        "flags_count": report.flags_count,
        "is_hidden": report.is_hidden,
        "message": "Report hidden pending moderator review" if report.is_hidden else "Report flagged"
    }

@router.get("/reports/heatmap", response_model=List[HeatmapPoint])
async def get_safety_heatmap(db: AsyncSession = Depends(get_db)):
    """Returns weighted points for rendering density heatmap in Delhi."""
    res = await db.execute(select(IncidentReport).where(IncidentReport.is_hidden == False))
    reports = res.scalars().all()
    points = []
    for r in reports:
        # Weight = severity (1-3) * log(1 + confirmations)
        weight = r.severity * (1.0 + 0.2 * min(5, r.confirmations_count))
        points.append({
            "lat": r.lat,
            "lng": r.lng,
            "weight": round(weight, 2),
            "category": r.category,
            "severity": r.severity
        })
    return points

@router.post("/volunteers/toggle")
async def toggle_volunteer_status(
    user_id: str,
    available: bool,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    db: AsyncSession = Depends(get_db)
):
    """Opt-in or toggle volunteer availability mode with coarse location."""
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_volunteer = True
    user.volunteer_available = available
    if lat and lng:
        user.last_lat = lat
        user.last_lng = lng

    await db.commit()
    return {
        "success": True,
        "is_volunteer": user.is_volunteer,
        "volunteer_available": user.volunteer_available
    }
