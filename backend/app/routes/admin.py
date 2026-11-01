from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional
from backend.app.db import get_db
from backend.app.config import settings
from backend.app.models.trip import Trip
from backend.app.models.sos import SOSEvent
from backend.app.models.report import IncidentReport
from backend.app.models.message import MessageLog

router = APIRouter(tags=["Admin"])

@router.get("/api/admin/overview")
async def get_admin_overview(key: str = Query(None), db: AsyncSession = Depends(get_db)):
    if key != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    active_trips_res = await db.execute(select(Trip).where(Trip.status == "ACTIVE"))
    active_trips = active_trips_res.scalars().all()

    active_sos_res = await db.execute(select(SOSEvent).where(SOSEvent.status == "ACTIVE"))
    active_sos = active_sos_res.scalars().all()

    reports_res = await db.execute(select(IncidentReport).order_by(desc(IncidentReport.created_at)).limit(20))
    reports = reports_res.scalars().all()

    messages_res = await db.execute(select(MessageLog).order_by(desc(MessageLog.created_at)).limit(25))
    messages = messages_res.scalars().all()

    return {
        "active_trips_count": len(active_trips),
        "active_sos_count": len(active_sos),
        "total_reports_count": len(reports),
        "active_trips": [
            {
                "id": t.id,
                "origin": t.origin_name,
                "destination": t.destination_name,
                "battery": t.battery_level,
                "safety_score": t.safety_score,
                "tracking_token": t.tracking_token
            }
            for t in active_trips
        ],
        "active_sos": [
            {
                "id": s.id,
                "trigger_type": s.trigger_type,
                "lat": s.lat,
                "lng": s.lng,
                "battery": s.battery_level,
                "tracking_url": f"{settings.PUBLIC_BASE_URL}/track/{s.tracking_token}",
                "created_at": s.created_at.isoformat()
            }
            for s in active_sos
        ],
        "recent_reports": [
            {
                "id": r.id,
                "category": r.category,
                "severity": r.severity,
                "description": r.description,
                "flags": r.flags_count,
                "is_hidden": r.is_hidden
            }
            for r in reports
        ],
        "message_logs": [
            {
                "id": m.id,
                "recipient": m.recipient_phone,
                "channel": m.channel,
                "status": m.status,
                "content": m.content,
                "created_at": m.created_at.isoformat()
            }
            for m in messages
        ]
    }

@router.get("/admin", response_class=HTMLResponse)
async def admin_dashboard_page(passcode: Optional[str] = Query(None)):
    """Clean, high-trust administrative console for Delhi SafeRoute dispatchers."""
    # Check passcode
    is_authenticated = (passcode == settings.ADMIN_PASSWORD)
    
    if not is_authenticated:
        return HTMLResponse(content=f"""<!DOCTYPE html>
<html>
<head>
  <title>SafeRoute Admin Login</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {{ font-family: -apple-system, sans-serif; background: #1b1f3b; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }}
    .card {{ background: #262a4a; padding: 32px; border-radius: 12px; width: 340px; box-shadow: 0 8px 24px rgba(0,0,0,0.3); text-align: center; }}
    input {{ width: 100%; padding: 12px; margin: 16px 0; border-radius: 6px; border: 1px solid #4a4e70; background: #1b1f3b; color: white; box-sizing: border-box; }}
    button {{ width: 100%; padding: 12px; background: #3b4cca; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }}
  </style>
</head>
<body>
  <div class="card">
    <h2>SafeRoute Admin</h2>
    <p style="color:#a5a7b8; font-size:14px; margin-top:8px;">Enter administrator security key</p>
    <form method="GET" action="/admin">
      <input type="password" name="passcode" placeholder="Password (default: SafeDelhi2026)" required autofocus />
      <button type="submit">Access Dashboard</button>
    </form>
  </div>
</body>
</html>
""")

    return HTMLResponse(content=f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SafeRoute Delhi - Emergency Dispatch & Operations</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #fbfaf7; color: #1b1f3b; margin: 0; padding: 24px; }}
    header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e3e0d8; padding-bottom: 16px; margin-bottom: 24px; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }}
    .card {{ background: white; border-radius: 10px; border: 1px solid #e3e0d8; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }}
    .badge {{ display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold; }}
    .badge-sos {{ background: #ffebee; color: #d9453d; }}
    .badge-trip {{ background: #e3f2fd; color: #1976d2; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }}
    th, td {{ padding: 10px 8px; text-align: left; border-bottom: 1px solid #f0eee8; }}
    th {{ color: #6b6e85; font-weight: 600; }}
    .btn {{ display: inline-block; background: #3b4cca; color: white; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 600; }}
    .stat-number {{ font-size: 32px; font-weight: 700; margin-top: 8px; }}
  </style>
</head>
<body>
  <header>
    <div>
      <h1 style="font-size:24px; font-weight:700;">SafeRoute Delhi — Dispatch Console</h1>
      <p style="color:#6b6e85; font-size:14px;">Real-time emergency events, active trip tracking & report moderation</p>
    </div>
    <span class="badge" style="background:#e8f5e9; color:#2e7d32; padding:8px 12px;">SYSTEM OPERATIONAL</span>
  </header>

  <div class="grid" style="margin-bottom:24px;">
    <div class="card">
      <div style="color:#6b6e85; font-size:13px; font-weight:600;">ACTIVE SOS ALERTS</div>
      <div id="sosCount" class="stat-number" style="color:#d9453d;">0</div>
    </div>
    <div class="card">
      <div style="color:#6b6e85; font-size:13px; font-weight:600;">ACTIVE TRIPS IN PROGRESS</div>
      <div id="tripCount" class="stat-number" style="color:#3b4cca;">0</div>
    </div>
    <div class="card">
      <div style="color:#6b6e85; font-size:13px; font-weight:600;">COMMUNITY REPORTS</div>
      <div id="reportCount" class="stat-number" style="color:#1f9d6b;">0</div>
    </div>
  </div>

  <div class="grid">
    <div class="card" style="grid-column: 1 / -1;">
      <h3 style="margin-bottom:12px; color:#d9453d;">Active Emergency SOS Events</h3>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Trigger Type</th>
              <th>Coordinates</th>
              <th>Battery</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="sosTableBody">
            <tr><td colspan="6" style="text-align:center; color:#6b6e85;">No active SOS alerts</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <h3>Active Trips</h3>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr><th>Route</th><th>Score</th><th>Live Track</th></tr>
          </thead>
          <tbody id="tripsTableBody">
            <tr><td colspan="3" style="text-align:center; color:#6b6e85;">Loading trips...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <h3>SMS / WhatsApp Message Log (Mock & Twilio)</h3>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr><th>Recipient</th><th>Channel</th><th>Status</th><th>Time</th></tr>
          </thead>
          <tbody id="messagesTableBody">
            <tr><td colspan="4" style="text-align:center; color:#6b6e85;">Loading messages...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    const passcode = "{passcode}";
    async function loadData() {{
      try {{
        const res = await fetch(`/api/admin/overview?key=${{passcode}}`);
        if (!res.ok) return;
        const data = await res.json();
        
        document.getElementById('sosCount').textContent = data.active_sos_count;
        document.getElementById('tripCount').textContent = data.active_trips_count;
        document.getElementById('reportCount').textContent = data.total_reports_count;

        // SOS Table
        const sosBody = document.getElementById('sosTableBody');
        if (data.active_sos.length === 0) {{
          sosBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#6b6e85;">No active emergency SOS alerts</td></tr>';
        }} else {{
          sosBody.innerHTML = data.active_sos.map(s => `
            <tr style="background:#fff5f5;">
              <td><code>${{s.id.substring(0,8)}}</code></td>
              <td><span class="badge badge-sos">${{s.trigger_type}}</span></td>
              <td>${{s.lat.toFixed(4)}}, ${{s.lng.toFixed(4)}}</td>
              <td>${{s.battery}}%</td>
              <td>${{new Date(s.created_at).toLocaleTimeString()}}</td>
              <td><a href="${{s.tracking_url}}" target="_blank" class="btn" style="background:#d9453d;">View Live Map</a></td>
            </tr>
          `).join('');
        }}

        // Trips Table
        const tripBody = document.getElementById('tripsTableBody');
        if (data.active_trips.length === 0) {{
          tripBody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#6b6e85;">No trips currently active</td></tr>';
        }} else {{
          tripBody.innerHTML = data.active_trips.map(t => `
            <tr>
              <td><strong>${{t.destination}}</strong></td>
              <td>${{t.safety_score}}/100</td>
              <td><a href="/track/${{t.tracking_token}}" target="_blank" class="btn">Track</a></td>
            </tr>
          `).join('');
        }}

        // Messages Table
        const msgBody = document.getElementById('messagesTableBody');
        msgBody.innerHTML = data.message_logs.slice(0, 8).map(m => `
          <tr>
            <td>${{m.recipient}}</td>
            <td><span class="badge badge-trip">${{m.channel}}</span></td>
            <td><strong>${{m.status}}</strong></td>
            <td>${{new Date(m.created_at).toLocaleTimeString()}}</td>
          </tr>
        `).join('');

      }} catch (err) {{
        console.error(err);
      }}
    }}

    loadData();
    setInterval(loadData, 5000);
  </script>
</body>
</html>
""")
