import json
import secrets
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.db import get_db
from backend.app.config import settings
from backend.app.models.trip import Trip, LocationBreadcrumb
from backend.app.models.user import User, Contact
from backend.app.models.sos import SOSEvent
from backend.app.schemas.trip import TripStartRequest, TripStatusUpdateRequest, TripResponse, PublicTrackingState, BreadcrumbCreate
from backend.app.services.notify import notification_service

router = APIRouter(tags=["Trips & Tracking"])

# In-memory WebSocket connection manager for public live tracking
class TrackingConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, token: str, websocket: WebSocket):
        await websocket.accept()
        if token not in self.active_connections:
            self.active_connections[token] = []
        self.active_connections[token].append(websocket)

    def disconnect(self, token: str, websocket: WebSocket):
        if token in self.active_connections:
            self.active_connections[token].remove(websocket)
            if not self.active_connections[token]:
                del self.active_connections[token]

    async def broadcast(self, token: str, message: dict):
        if token in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[token]:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead_connections.append(connection)
            for dead in dead_connections:
                self.disconnect(token, dead)

ws_manager = TrackingConnectionManager()

@router.post("/api/trips/start", response_model=TripResponse)
async def start_trip(payload: TripStartRequest, db: AsyncSession = Depends(get_db)):
    """Start live trip, create tracking token, notify contacts with live link."""
    token = secrets.token_urlsafe(24)
    expires_at = datetime.utcnow() + timedelta(hours=settings.TRACKING_TOKEN_EXPIRE_HOURS + 2)

    trip = Trip(
        user_id=payload.user_id,
        status="ACTIVE",
        origin_name=payload.origin_name,
        origin_lat=payload.origin.lat,
        origin_lng=payload.origin.lng,
        destination_name=payload.destination_name,
        destination_lat=payload.destination.lat,
        destination_lng=payload.destination.lng,
        travel_mode=payload.travel_mode,
        route_type=payload.route_type,
        planned_route_geometry=json.dumps(payload.planned_route_geometry),
        planned_duration_s=payload.planned_duration_s,
        planned_distance_m=payload.planned_distance_m,
        safety_score=payload.safety_score,
        tracking_token=token,
        token_expires_at=expires_at,
        battery_level=payload.battery_level,
        start_time=datetime.utcnow()
    )
    db.add(trip)
    await db.commit()
    await db.refresh(trip)

    # Initial breadcrumb
    bc = LocationBreadcrumb(
        trip_id=trip.id,
        lat=payload.origin.lat,
        lng=payload.origin.lng,
        battery=payload.battery_level,
        speed=0.0
    )
    db.add(bc)
    await db.commit()

    tracking_url = f"{settings.PUBLIC_BASE_URL}/track/{token}"

    # Auto-notify contacts if enabled
    user_res = await db.execute(select(User).where(User.id == payload.user_id))
    user = user_res.scalar_one_or_none()
    user_name = user.name if user else "Your friend"

    if user and user.auto_share_trips:
        contacts_res = await db.execute(select(Contact).where(Contact.user_id == user.id))
        contacts = contacts_res.scalars().all()
        start_msg = (
            f"SafeRoute Alert: {user_name} started a trip to {payload.destination_name} in Delhi. "
            f"Safety Score: {payload.safety_score}/100. "
            f"Follow live tracking: {tracking_url}"
        )
        for c in contacts:
            if c.notify_sms:
                await notification_service.send_sms_or_whatsapp(db, c.phone, start_msg, "SMS", "Trip Started")

    resp_data = trip.__dict__.copy()
    resp_data["planned_route_geometry"] = payload.planned_route_geometry
    resp_data["tracking_url"] = tracking_url
    return resp_data

@router.post("/api/trips/{trip_id}/update")
async def update_trip_breadcrumb(trip_id: str, payload: BreadcrumbCreate, db: AsyncSession = Depends(get_db)):
    """Append live GPS location, speed, battery and broadcast to WebSocket."""
    res = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = res.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip.battery_level = payload.battery
    trip.current_speed = payload.speed

    bc = LocationBreadcrumb(
        trip_id=trip.id,
        lat=payload.lat,
        lng=payload.lng,
        speed=payload.speed,
        battery=payload.battery,
        accuracy=payload.accuracy,
        created_at=datetime.utcnow()
    )
    db.add(bc)
    await db.commit()

    # Check for active SOS
    sos_res = await db.execute(
        select(SOSEvent).where(SOSEvent.trip_id == trip.id, SOSEvent.status == "ACTIVE")
    )
    sos = sos_res.scalar_one_or_none()

    # Broadcast to WebSocket subscribers for this tracking token
    ws_payload = {
        "type": "LOCATION_UPDATE",
        "trip_id": trip.id,
        "lat": payload.lat,
        "lng": payload.lng,
        "speed": payload.speed,
        "battery": payload.battery,
        "status": trip.status,
        "is_sos_active": sos is not None,
        "timestamp": datetime.utcnow().isoformat()
    }
    await ws_manager.broadcast(trip.tracking_token, ws_payload)

    return {"success": True, "trip_status": trip.status}

@router.post("/api/trips/{trip_id}/end")
async def end_trip(trip_id: str, db: AsyncSession = Depends(get_db)):
    """End trip and send 'Arrived safely' notification to contacts."""
    res = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = res.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip.status = "COMPLETED"
    trip.end_time = datetime.utcnow()
    trip.token_expires_at = datetime.utcnow() + timedelta(hours=settings.TRACKING_TOKEN_EXPIRE_HOURS)
    await db.commit()

    # Notify contacts
    user_res = await db.execute(select(User).where(User.id == trip.user_id))
    user = user_res.scalar_one_or_none()
    user_name = user.name if user else "Your friend"

    if user and user.auto_share_trips:
        contacts_res = await db.execute(select(Contact).where(Contact.user_id == user.id))
        contacts = contacts_res.scalars().all()
        end_msg = f"SafeRoute: {user_name} has arrived safely at {trip.destination_name}. Trip ended."
        for c in contacts:
            if c.notify_sms:
                await notification_service.send_sms_or_whatsapp(db, c.phone, end_msg, "SMS", "Arrived Safely")

    # Broadcast trip completion to WebSocket
    await ws_manager.broadcast(trip.tracking_token, {
        "type": "TRIP_COMPLETED",
        "status": "COMPLETED",
        "message": f"{user_name} arrived safely."
    })

    return {"success": True, "message": "Trip marked as completed and contacts notified"}

@router.get("/api/track/{token}/state", response_model=PublicTrackingState)
async def get_public_tracking_state(token: str, db: AsyncSession = Depends(get_db)):
    """Polling API fallback for public tracking page."""
    trip_res = await db.execute(select(Trip).where(Trip.tracking_token == token))
    trip = trip_res.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Tracking token not found or expired")

    user_res = await db.execute(select(User).where(User.id == trip.user_id))
    user = user_res.scalar_one_or_none()

    # Fetch last 30 minutes of breadcrumbs
    thirty_mins_ago = datetime.utcnow() - timedelta(minutes=30)
    bc_res = await db.execute(
        select(LocationBreadcrumb)
        .where(LocationBreadcrumb.trip_id == trip.id, LocationBreadcrumb.created_at >= thirty_mins_ago)
        .order_by(LocationBreadcrumb.created_at.asc())
    )
    breadcrumbs = bc_res.scalars().all()

    last_bc = breadcrumbs[-1] if breadcrumbs else None
    current_lat = last_bc.lat if last_bc else trip.origin_lat
    current_lng = last_bc.lng if last_bc else trip.origin_lng

    # SOS status
    sos_res = await db.execute(
        select(SOSEvent).where(SOSEvent.tracking_token == token, SOSEvent.status == "ACTIVE")
    )
    active_sos = sos_res.scalar_one_or_none()

    try:
        planned_geom = json.loads(trip.planned_route_geometry)
    except Exception:
        planned_geom = []

    return {
        "trip_id": trip.id,
        "user_name": user.name if user else "SafeRoute User",
        "status": "SOS_ACTIVE" if active_sos else trip.status,
        "current_lat": current_lat,
        "current_lng": current_lng,
        "current_speed": trip.current_speed,
        "battery_level": trip.battery_level,
        "last_updated": last_bc.created_at if last_bc else trip.start_time,
        "planned_route": planned_geom,
        "breadcrumbs_30m": [[b.lat, b.lng] for b in breadcrumbs],
        "is_sos_active": active_sos is not None,
        "sos_audio_url": active_sos.audio_url if active_sos else None,
        "sos_photo_url": active_sos.photo_url if active_sos else None,
        "eta_seconds_remaining": max(0, trip.planned_duration_s - int((datetime.utcnow() - trip.start_time).total_seconds())),
        "distance_remaining_m": trip.planned_distance_m
    }

@router.websocket("/ws/track/{token}")
async def websocket_tracking_endpoint(websocket: WebSocket, token: str):
    await ws_manager.connect(token, websocket)
    try:
        while True:
            # Keep connection open and receive optional ping/pong
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(token, websocket)

@router.get("/track/{token}", response_class=HTMLResponse)
async def public_web_tracking_page(token: str):
    """Serve responsive, mobile-first public tracking webpage with Leaflet map and live WebSocket."""
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>SafeRoute Delhi - Live Trip Tracking</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #fbfaf7;
      color: #1b1f3b;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }}
    header {{
      background: #1b1f3b;
      color: #fbfaf7;
      padding: 12px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
    }}
    .logo-container {{
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    .logo-badge {{
      background: #3b4cca;
      color: white;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 13px;
      letter-spacing: 0.5px;
    }}
    .header-title {{
      font-family: 'Bricolage Grotesque', sans-serif;
      font-size: 18px;
      font-weight: 700;
    }}
    .btn-call-112 {{
      background: #d9453d;
      color: white;
      text-decoration: none;
      padding: 8px 14px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 6px rgba(217, 69, 61, 0.4);
    }}
    #map {{
      flex: 1;
      width: 100%;
      height: 100%;
      z-index: 1;
    }}
    .status-hud {{
      background: #ffffff;
      border-top: 1px solid #e3e0d8;
      padding: 14px 18px;
      box-shadow: 0 -4px 16px rgba(0,0,0,0.08);
      z-index: 1000;
    }}
    .hud-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }}
    .user-info {{
      font-size: 16px;
      font-weight: 600;
      color: #1b1f3b;
    }}
    .status-pill {{
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    .status-active {{ background: #e3f2fd; color: #1976d2; }}
    .status-sos {{ background: #ffebee; color: #d9453d; animation: pulse 1.5s infinite; }}
    .status-completed {{ background: #e8f5e9; color: #2e7d32; }}
    .hud-metrics {{
      display: flex;
      gap: 16px;
      font-size: 13px;
      color: #6b6e85;
      margin-top: 6px;
    }}
    .metric-item {{
      display: flex;
      align-items: center;
      gap: 4px;
    }}
    .sos-banner {{
      background: #d9453d;
      color: white;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 600;
      display: none;
      align-items: center;
      justify-content: space-between;
    }}
    @keyframes pulse {{
      0% {{ opacity: 1; }}
      50% {{ opacity: 0.5; }}
      100% {{ opacity: 1; }}
    }}
  </style>
</head>
<body>
  <header>
    <div class="logo-container">
      <span class="logo-badge">DELHI</span>
      <span class="header-title">SafeRoute Live</span>
    </div>
    <a href="tel:112" class="btn-call-112">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
      Call 112
    </a>
  </header>

  <div id="sosBanner" class="sos-banner">
    <span>EMERGENCY: User has triggered an SOS Alert!</span>
    <a href="tel:112" style="color:white; text-decoration:underline;">Dial Police</a>
  </div>

  <div id="map"></div>

  <div class="status-hud">
    <div class="hud-header">
      <span id="userName" class="user-info">Tracking SafeRoute Traveler...</span>
      <span id="statusBadge" class="status-pill status-active">Active</span>
    </div>
    <div class="hud-metrics">
      <div class="metric-item">
        <span>Battery:</span>
        <strong id="batteryVal">--%</strong>
      </div>
      <div class="metric-item">
        <span>Speed:</span>
        <strong id="speedVal">-- km/h</strong>
      </div>
      <div class="metric-item">
        <span>Last updated:</span>
        <strong id="lastUpdateVal">Just now</strong>
      </div>
    </div>
  </div>

  <script>
    const token = "{token}";
    const map = L.map('map').setView([28.6139, 77.2090], 14);

    L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
      maxZoom: 19,
      attribution: '© OpenStreetMap SafeRoute Delhi'
    }}).addTo(map);

    let travelerMarker = null;
    let trailPolyline = null;
    let plannedPolyline = null;

    // Custom pulsing traveler icon
    const liveIcon = L.divIcon({{
      className: 'custom-live-marker',
      html: '<div style="background:#3b4cca; width:18px; height:18px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px rgba(59,76,202,0.6);"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    }});

    const sosIcon = L.divIcon({{
      className: 'custom-sos-marker',
      html: '<div style="background:#d9453d; width:24px; height:24px; border-radius:50%; border:3px solid white; box-shadow:0 0 14px rgba(217,69,61,0.9); animation:pulse 1s infinite;"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    }});

    async function loadInitialState() {{
      try {{
        const res = await fetch(`/api/track/${{token}}/state`);
        if (!res.ok) return;
        const data = await res.json();
        
        document.getElementById('userName').textContent = data.user_name;
        document.getElementById('batteryVal').textContent = `${{data.battery_level}}%`;
        document.getElementById('speedVal').textContent = `${{(data.current_speed * 3.6).toFixed(1)}} km/h`;
        
        updateStatusDisplay(data.status, data.is_sos_active);

        // Draw planned route
        if (data.planned_route && data.planned_route.length > 0) {{
          plannedPolyline = L.polyline(data.planned_route, {{
            color: '#6b6e85',
            weight: 4,
            dashArray: '5, 8',
            opacity: 0.7
          }}).addTo(map);
        }}

        // Draw breadcrumbs trail
        if (data.breadcrumbs_30m && data.breadcrumbs_30m.length > 0) {{
          trailPolyline = L.polyline(data.breadcrumbs_30m, {{
            color: '#1f9d6b',
            weight: 5,
            opacity: 0.8
          }}).addTo(map);
        }}

        // Set moving marker
        const iconToUse = data.is_sos_active ? sosIcon : liveIcon;
        travelerMarker = L.marker([data.current_lat, data.current_lng], {{ icon: iconToUse }}).addTo(map);
        map.setView([data.current_lat, data.current_lng], 15);

      }} catch (e) {{
        console.error('Error fetching tracking state:', e);
      }}
    }}

    function updateStatusDisplay(status, isSos) {{
      const badge = document.getElementById('statusBadge');
      const banner = document.getElementById('sosBanner');
      
      if (isSos || status === 'SOS_ACTIVE') {{
        badge.className = 'status-pill status-sos';
        badge.textContent = 'SOS Active';
        banner.style.display = 'flex';
        if (travelerMarker) travelerMarker.setIcon(sosIcon);
      }} else if (status === 'COMPLETED' || status === 'ARRIVED_SAFELY') {{
        badge.className = 'status-pill status-completed';
        badge.textContent = 'Arrived Safely';
        banner.style.display = 'none';
        if (travelerMarker) travelerMarker.setIcon(liveIcon);
      }} else {{
        badge.className = 'status-pill status-active';
        badge.textContent = 'Traveling';
        banner.style.display = 'none';
        if (travelerMarker) travelerMarker.setIcon(liveIcon);
      }}
    }}

    function setupWebSocket() {{
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${{wsProtocol}}//${{window.location.host}}/ws/track/${{token}}`;
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {{
        try {{
          const msg = JSON.parse(event.data);
          if (msg.type === 'LOCATION_UPDATE') {{
            const lat = msg.lat;
            const lng = msg.lng;
            
            if (travelerMarker) {{
              travelerMarker.setLatLng([lat, lng]);
            }}
            if (trailPolyline) {{
              trailPolyline.addLatLng([lat, lng]);
            }}
            document.getElementById('batteryVal').textContent = `${{msg.battery}}%`;
            document.getElementById('speedVal').textContent = `${{(msg.speed * 3.6).toFixed(1)}} km/h`;
            document.getElementById('lastUpdateVal').textContent = 'Just now';
            updateStatusDisplay(msg.status, msg.is_sos_active);
          }} else if (msg.type === 'TRIP_COMPLETED') {{
            updateStatusDisplay('COMPLETED', false);
          }}
        }} catch (err) {{
          console.error(err);
        }}
      }};

      ws.onclose = () => {{
        // Auto-reconnect after 3 seconds
        setTimeout(setupWebSocket, 3000);
      }};
    }}

    loadInitialState();
    setupWebSocket();

    // Polling fallback every 8s
    setInterval(loadInitialState, 8000);
  </script>
</body>
</html>
"""
    return HTMLResponse(content=html_content)
