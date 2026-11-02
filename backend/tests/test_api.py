import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.db import init_db

@pytest.fixture(autouse=True)
async def setup_db():
    await init_db()

@pytest.mark.anyio
async def test_health_check_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["delhi_center"] == [28.6139, 77.209]

@pytest.mark.anyio
async def test_geocode_search():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/geocode/search?q=India Gate")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert "India Gate" in data[0]["name"]

@pytest.mark.anyio
async def test_route_plan_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "origin": {"lat": 28.6328, "lng": 77.2197}, # Connaught Place
            "destination": {"lat": 28.6129, "lng": 77.2295}, # India Gate
            "mode": "walking",
            "is_night_preview": False
        }
        response = await ac.post("/api/routes/plan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "routes" in data
    assert len(data["routes"]) >= 2
    
    # Verify Safest and Fastest routes have distinct safety scores
    route_ids = [r["id"] for r in data["routes"]]
    assert "safest" in route_ids
    assert "fastest" in route_ids
    
    safest_r = next(r for r in data["routes"] if r["id"] == "safest")
    fastest_r = next(r for r in data["routes"] if r["id"] == "fastest")
    assert safest_r["safety_score"] > fastest_r["safety_score"]
    assert len(safest_r["segments"]) > 0
    assert safest_r["weakest_stretch"] is not None

@pytest.mark.anyio
async def test_geocode_reverse():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Near Connaught Place (28.6328, 77.2197)
        response = await ac.get("/api/geocode/reverse?lat=28.6328&lng=77.2197")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "Connaught Place" in data["name"]
