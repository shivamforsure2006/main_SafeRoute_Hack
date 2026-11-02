import httpx
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any, Optional
from backend.app.db import get_db
from backend.app.config import settings
from backend.app.models.report import IncidentReport
from backend.app.schemas.routing import RoutePlanRequest, RoutePlanResponse
from backend.app.services.routing import routing_service
from backend.app.services.osm import osm_service, haversine_distance

router = APIRouter(prefix="/api", tags=["Routing & Geocoding"])

# Curated high-priority Delhi POIs for instant autocomplete
DELHI_CURATED_PLACES = [
    {"name": "Connaught Place, Central Delhi", "lat": 28.6328, "lng": 77.2197, "type": "commercial"},
    {"name": "India Gate, Rajpath", "lat": 28.6129, "lng": 77.2295, "type": "monument"},
    {"name": "Hauz Khas Village, South Delhi", "lat": 28.5489, "lng": 77.2058, "type": "neighborhood"},
    {"name": "Saket Select CITYWALK, South Delhi", "lat": 28.5285, "lng": 77.2185, "type": "commercial"},
    {"name": "Karol Bagh Market, Central Delhi", "lat": 28.6515, "lng": 77.1910, "type": "market"},
    {"name": "Lajpat Nagar Central Market", "lat": 28.5685, "lng": 77.2425, "type": "market"},
    {"name": "Nehru Place IT Hub", "lat": 28.5490, "lng": 77.2520, "type": "commercial"},
    {"name": "Dwarka Sector 21 Metro", "lat": 28.5522, "lng": 77.0583, "type": "transit"},
    {"name": "Chandni Chowk, Old Delhi", "lat": 28.6570, "lng": 77.2300, "type": "heritage"},
    {"name": "Rajiv Chowk Metro Station", "lat": 28.6328, "lng": 77.2197, "type": "transit"},
    {"name": "New Delhi Railway Station (NDLS)", "lat": 28.6425, "lng": 77.2210, "type": "transit"},
    {"name": "Indira Gandhi International Airport (IGI T3)", "lat": 28.5562, "lng": 77.1000, "type": "airport"},
    {"name": "AIIMS New Delhi, Ansari Nagar", "lat": 28.5672, "lng": 77.2100, "type": "hospital"}
]

@router.get("/geocode/search")
async def geocode_search(q: str = Query(..., min_length=2)):
    """Delhi NCR biased autocomplete geocoding endpoint."""
    q_lower = q.lower().strip()
    
    # 1. Match against curated Delhi landmarks first for instant response
    local_matches = [
        p for p in DELHI_CURATED_PLACES
        if q_lower in p["name"].lower()
    ]
    if local_matches:
        return local_matches

    # 2. Query OpenStreetMap Nominatim with Delhi Viewbox
    # viewbox: min_lon, max_lat, max_lon, min_lat (76.85, 28.88, 77.40, 28.40)
    nominatim_url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": q,
        "format": "json",
        "viewbox": "76.85,28.88,77.40,28.40",
        "bounded": 1,
        "limit": 5,
        "addressdetails": 1
    }
    headers = {
        "User-Agent": "SafeRouteDelhi/1.0 (safety.hackathon.delhi@gmail.com)"
    }

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(nominatim_url, params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                results = []
                for item in data:
                    results.append({
                        "name": item.get("display_name", q),
                        "lat": float(item["lat"]),
                        "lng": float(item["lon"]),
                        "type": item.get("type", "location")
                    })
                if results:
                    return results
    except Exception as e:
        print(f"Nominatim error: {e}")

    # Fallback default
    return [
        {"name": f"{q.title()}, Delhi NCR", "lat": settings.DELHI_CENTER_LAT, "lng": settings.DELHI_CENTER_LNG, "type": "area"}
    ]

@router.get("/geocode/reverse")
async def geocode_reverse(lat: float = Query(...), lng: float = Query(...)):
    """Reverse geocode coordinates to a human-readable location in Delhi NCR."""
    # 1. Match against curated Delhi places within 800m for instant response
    closest = None
    min_dist = float("inf")
    for p in DELHI_CURATED_PLACES:
        dist = haversine_distance(lat, lng, p["lat"], p["lng"])
        if dist < min_dist:
            min_dist = dist
            closest = p

    if closest and min_dist < 800:
        return {"name": closest["name"], "lat": lat, "lng": lng, "type": closest.get("type", "landmark")}

    # 2. Query OpenStreetMap Nominatim reverse geocode
    nominatim_url = "https://nominatim.openstreetmap.org/reverse"
    params = {
        "lat": lat,
        "lon": lng,
        "format": "json",
        "zoom": 16,
        "addressdetails": 1
    }
    headers = {
        "User-Agent": "SafeRouteDelhi/1.0 (safety.hackathon.delhi@gmail.com)"
    }
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(nominatim_url, params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                display_name = data.get("display_name")
                if display_name:
                    return {"name": display_name, "lat": lat, "lng": lng, "type": "reverse"}
    except Exception as e:
        print(f"Nominatim reverse geocode error: {e}")

    return {
        "name": f"Delhi NCR ({lat:.4f}, {lng:.4f})",
        "lat": lat,
        "lng": lng,
        "type": "coordinates"
    }

@router.post("/routes/plan", response_model=RoutePlanResponse)
async def plan_routes(payload: RoutePlanRequest, db: AsyncSession = Depends(get_db)):
    """Evaluate and compare 2-3 routes (Safest vs Fastest) with safety scores and breakdowns."""
    # Fetch active incident reports within Delhi area
    rep_res = await db.execute(
        select(IncidentReport).where(IncidentReport.is_hidden == False)
    )
    db_reports = rep_res.scalars().all()
    reports_data = [
        {
            "lat": r.lat,
            "lng": r.lng,
            "category": r.category,
            "severity": r.severity,
            "created_at": r.created_at
        }
        for r in db_reports
    ]

    routes = await routing_service.plan_routes(
        o_lat=payload.origin.lat,
        o_lng=payload.origin.lng,
        d_lat=payload.destination.lat,
        d_lng=payload.destination.lng,
        mode=payload.mode,
        is_night=payload.is_night_preview,
        incident_reports=reports_data
    )

    return {
        "origin_name": f"Origin ({round(payload.origin.lat, 4)}, {round(payload.origin.lng, 4)})",
        "destination_name": f"Destination ({round(payload.destination.lat, 4)}, {round(payload.destination.lng, 4)})",
        "routes": routes,
        "cached_layers": {
            "safe_havens_count": len(osm_service.get_all_safe_havens()),
            "lighting_count": len(osm_service.get_all_lighting()),
            "active_spots_count": len(osm_service.get_all_activity())
        }
    }
