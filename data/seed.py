"""
SafeRoute Delhi - Demo Database Seeder
======================================
DISCLAIMER: All incident reports, volunteer locations, and trips seeded by this script
are SYNTHETIC DEMO DATA designed for testing and hackathon demonstration purposes.
They do not represent real-world emergency records.
"""

import asyncio
import json
import uuid
import sys
import os
from datetime import datetime, timedelta

# Ensure workspace root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from backend.app.db import AsyncSessionLocal, init_db
from backend.app.models.user import User, Contact
from backend.app.models.trip import Trip, LocationBreadcrumb
from backend.app.models.report import IncidentReport
from backend.app.models.message import MessageLog
from backend.app.services.routing import DELHI_PRESET_ROUTES

# 40+ Plausible Mock Incident Reports clustered around Delhi NCR
MOCK_INCIDENTS = [
    # Connaught Place & Paharganj Clusters
    {"category": "poor_lighting", "severity": 2, "lat": 28.6360, "lng": 77.2140, "address": "Paharganj back alley, NDLS North", "desc": "Street lights non-functional for past 3 nights."},
    {"category": "harassment", "severity": 3, "lat": 28.6385, "lng": 77.2180, "address": "Underpass near New Delhi Rly", "desc": "Unsafe catcalling and lack of security presence."},
    {"category": "isolated_area", "severity": 2, "lat": 28.6410, "lng": 77.2160, "address": "Bhavbhuti Marg Service Lane", "desc": "Completely empty corridor with broken pavement."},
    {"category": "unsafe_crowd", "severity": 2, "lat": 28.6430, "lng": 77.2230, "address": "Ajmeri Gate Outer Perimeter", "desc": "Rowdy gatherings near unattended taxi stand."},
    {"category": "stray_animals", "severity": 1, "lat": 28.6300, "lng": 77.2150, "address": "Scindia House lane", "desc": "Pack of aggressive stray dogs near parking lot."},
    {"category": "road_hazard", "severity": 2, "lat": 28.6270, "lng": 77.2200, "address": "Janpath Outer Circle intersection", "desc": "Open manhole covered with loose wooden plank."},
    
    # Old Delhi & Chandni Chowk Clusters
    {"category": "poor_lighting", "severity": 2, "lat": 28.6540, "lng": 77.2310, "address": "Nai Sarak lane, Chandni Chowk", "desc": "Dim street lighting in narrow alleyway after 9 PM."},
    {"category": "unsafe_crowd", "severity": 3, "lat": 28.6590, "lng": 77.2280, "address": "Fatehpuri Masjid outer road", "desc": "Congested and unmonitored night gathering."},
    {"category": "isolated_area", "severity": 3, "lat": 28.6510, "lng": 77.2360, "address": "Daryaganj Ring Road connector", "desc": "Very secluded stretch with zero street vendors."},
    {"category": "stray_animals", "severity": 1, "lat": 28.6480, "lng": 77.2450, "address": "Yamuna Bazar underpass", "desc": "Stray animals blocking pedestrian footpath."},
    
    # South Delhi (Hauz Khas, Green Park, Saket)
    {"category": "poor_lighting", "severity": 2, "lat": 28.5520, "lng": 77.1980, "address": "Hauz Khas Village back entrance", "desc": "Dark walkway leading towards deer park perimeter."},
    {"category": "isolated_area", "severity": 2, "lat": 28.5460, "lng": 77.2010, "address": "Aurobindo Marg slip lane", "desc": "Unlit corridor between bus stand and metro gate."},
    {"category": "harassment", "severity": 3, "lat": 28.5510, "lng": 77.2040, "address": "Green Park main market lane", "desc": "Reported stalker incident near closed shop front."},
    {"category": "poor_lighting", "severity": 2, "lat": 28.5310, "lng": 77.2140, "address": "Saket District Centre service lane", "desc": "Broken overhead lamp poles."},
    {"category": "road_hazard", "severity": 1, "lat": 28.5260, "lng": 77.2190, "address": "Select Citywalk rear exit", "desc": "Construction debris spilling onto sidewalk."},
    {"category": "unsafe_crowd", "severity": 2, "lat": 28.5240, "lng": 77.2160, "address": "Saket Metro Station Gate 2", "desc": "Unregulated autos blocking pedestrian ramp."},
    
    # Central Delhi & Mandi House
    {"category": "isolated_area", "severity": 2, "lat": 28.6210, "lng": 77.2320, "address": "Tilak Marg service path", "desc": "Dense trees casting heavy shadows on footpath."},
    {"category": "poor_lighting", "severity": 2, "lat": 28.6180, "lng": 77.2280, "address": "Ferozeshah Road bend", "desc": "Flickering lights near government quarter wall."},
    {"category": "stray_animals", "severity": 1, "lat": 28.6150, "lng": 77.2250, "address": "Windsor Place roundabout", "desc": "Aggressive dogs barking at night pedestrians."},
    
    # Karol Bagh & Patel Nagar
    {"category": "unsafe_crowd", "severity": 2, "lat": 28.6530, "lng": 77.1880, "address": "Arya Samaj Road, Karol Bagh", "desc": "Dimly lit parking lot behind market."},
    {"category": "poor_lighting", "severity": 2, "lat": 28.6490, "lng": 77.1940, "address": "Pusa Road side road", "desc": "Multiple bulbs burned out along pedestrian path."},
    {"category": "harassment", "severity": 3, "lat": 28.6560, "lng": 77.1850, "address": "Dev Nagar corner", "desc": "Late night verbal harassment incident."},
    
    # Lajpat Nagar & South Extension
    {"category": "poor_lighting", "severity": 2, "lat": 28.5710, "lng": 77.2400, "address": "Central Market rear lane, Lajpat Nagar", "desc": "Back alley dark after market shutters down."},
    {"category": "road_hazard", "severity": 2, "lat": 28.5660, "lng": 77.2380, "address": "Ring Road flyover underbelly", "desc": "Potholes and poor drainage creating waterlogging."},
    {"category": "isolated_area", "severity": 2, "lat": 28.5720, "lng": 77.2200, "address": "South Extension Part 1 service lane", "desc": "No open shops or guards after 10:30 PM."},
    
    # Nehru Place & Kalkaji
    {"category": "unsafe_crowd", "severity": 2, "lat": 28.5470, "lng": 77.2510, "address": "Nehru Place Plaza parking basement", "desc": "Dimly lit staircase and isolated entrance."},
    {"category": "poor_lighting", "severity": 3, "lat": 28.5520, "lng": 77.2560, "address": "Kalkaji main road crossing", "desc": "Complete blackout on 100m street section."},
    {"category": "stray_animals", "severity": 1, "lat": 28.5440, "lng": 77.2500, "address": "Paras Cinema corner", "desc": "Pack of dogs near garbage container."},
    
    # Dwarka
    {"category": "isolated_area", "severity": 3, "lat": 28.5880, "lng": 77.0520, "address": "Dwarka Sector 10 trunk road", "desc": "Very wide dark road with no pedestrians at night."},
    {"category": "poor_lighting", "severity": 2, "lat": 28.5940, "lng": 77.0420, "address": "Dwarka Sector 12 DDA park boundary", "desc": "Perimeter lighting broken."},
    {"category": "harassment", "severity": 3, "lat": 28.5820, "lng": 77.0600, "address": "Sector 9 Metro station feeder lane", "desc": "Stalking report by night metro passenger."},
    
    # Additional clusters across Delhi to exceed 40 reports
    {"category": "poor_lighting", "severity": 2, "lat": 28.6080, "lng": 77.2150, "address": "Ashoka Road tree corridor", "desc": "Overhanging branches blocking sodium lamps."},
    {"category": "road_hazard", "severity": 1, "lat": 28.6020, "lng": 77.2240, "address": "Prithviraj Road intersection", "desc": "Uneven road surface near embassy checkpoint."},
    {"category": "isolated_area", "severity": 2, "lat": 28.5950, "lng": 77.2100, "address": "Safdarjung Tomb outer perimeter", "desc": "Dark pavement with high stone wall."},
    {"category": "stray_animals", "severity": 1, "lat": 28.5850, "lng": 77.2180, "address": "Lodhi Colony railway line crossing", "desc": "Stray dogs guarding vacant plot."},
    {"category": "poor_lighting", "severity": 2, "lat": 28.6650, "lng": 77.2150, "address": "Civil Lines residential road", "desc": "Dark tree canopy."},
    {"category": "unsafe_crowd", "severity": 2, "lat": 28.6400, "lng": 77.2050, "address": "Karol Bagh link road", "desc": "Drinking in open cars near service lane."},
    {"category": "harassment", "severity": 3, "lat": 28.6340, "lng": 77.2280, "address": "Barakhamba Road metro side gate", "desc": "Verbal harassment at night."},
    {"category": "poor_lighting", "severity": 2, "lat": 28.6290, "lng": 77.2350, "address": "Mandi House roundabout turn", "desc": "Street light pole damaged."},
    {"category": "isolated_area", "severity": 2, "lat": 28.6110, "lng": 77.2320, "address": "Pandara Road backside", "desc": "Very low footfall after 10 PM."},
    {"category": "road_hazard", "severity": 2, "lat": 28.5580, "lng": 77.2020, "address": "Yusuf Sarai market curb", "desc": "Broken sidewalk curb."}
]

# 15 Active Demo Volunteers stationed across Delhi
MOCK_VOLUNTEERS = [
    {"name": "Aarav Sharma", "phone": "+919811100001", "lat": 28.6320, "lng": 77.2180},
    {"name": "Sneha Gupta", "phone": "+919811100002", "lat": 28.6300, "lng": 77.2220},
    {"name": "Rohan Verma", "phone": "+919811100003", "lat": 28.6140, "lng": 77.2280},
    {"name": "Ananya Malik", "phone": "+919811100004", "lat": 28.6120, "lng": 77.2100},
    {"name": "Karan Mehra", "phone": "+919811100005", "lat": 28.5490, "lng": 77.2040},
    {"name": "Pooja Batra", "phone": "+919811100006", "lat": 28.5520, "lng": 77.2080},
    {"name": "Vikram Singh", "phone": "+919811100007", "lat": 28.5280, "lng": 77.2160},
    {"name": "Neha Kapoor", "phone": "+919811100008", "lat": 28.5300, "lng": 77.2190},
    {"name": "Arjun Nair", "phone": "+919811100009", "lat": 28.6520, "lng": 77.1900},
    {"name": "Divya Rao", "phone": "+919811100010", "lat": 28.5680, "lng": 77.2410},
    {"name": "Kabir Das", "phone": "+919811100011", "lat": 28.5480, "lng": 77.2510},
    {"name": "Tanvi Joshi", "phone": "+919811100012", "lat": 28.6570, "lng": 77.2310},
    {"name": "Sameer Khan", "phone": "+919811100013", "lat": 28.6420, "lng": 77.2220},
    {"name": "Meera Sen", "phone": "+919811100014", "lat": 28.5910, "lng": 77.0480},
    {"name": "Aditya Roy", "phone": "+919811100015", "lat": 28.5690, "lng": 77.2090}
]

# 3 Demo Users with Contacts
DEMO_USERS = [
    {
        "phone": "+919810012345",
        "name": "Ananya Sharma (Demo Traveler)",
        "normal_pin": "1234",
        "duress_pin": "9999",
        "contacts": [
            {"name": "Mom (Dr. Sunita)", "phone": "+919811122233", "relationship": "Parent"},
            {"name": "Rohit (Partner)", "phone": "+919877788899", "relationship": "Spouse"},
            {"name": "Pooja (Colleague)", "phone": "+919822233344", "relationship": "Friend"}
        ]
    },
    {
        "phone": "+919820054321",
        "name": "Priya Verma",
        "normal_pin": "4321",
        "duress_pin": "8888",
        "contacts": [
            {"name": "Sister (Kavita)", "phone": "+919833344455", "relationship": "Sibling"},
            {"name": "Dad", "phone": "+919844455566", "relationship": "Parent"}
        ]
    },
    {
        "phone": "+919830098765",
        "name": "Devika Sen",
        "normal_pin": "5678",
        "duress_pin": "7777",
        "contacts": [
            {"name": "Aman (Roommate)", "phone": "+919855566677", "relationship": "Friend"}
        ]
    }
]

async def seed_database():
    print("Initializing database tables...")
    await init_db()
    
    async with AsyncSessionLocal() as session:
        print("Checking existing records...")
        existing_rep = await session.execute(select(IncidentReport))
        if existing_rep.scalars().first():
            print("Database already contains records. Clearing old demo data for fresh seed...")
            from sqlalchemy import delete
            await session.execute(delete(IncidentReport))
            await session.execute(delete(User))
            await session.execute(delete(Trip))
            await session.commit()

        # 1. Seed Incident Reports
        print(f"Seeding {len(MOCK_INCIDENTS)} mock incident reports in Delhi NCR...")
        now = datetime.utcnow()
        for idx, inc in enumerate(MOCK_INCIDENTS):
            # Stagger timestamps within past 5 days
            created_time = now - timedelta(hours=idx * 2.5)
            report = IncidentReport(
                category=inc["category"],
                severity=inc["severity"],
                lat=inc["lat"],
                lng=inc["lng"],
                address_label=inc["address"],
                description=f"[Demo Data] {inc['desc']}",
                confirmations_count=1 + (idx % 4),
                flags_count=0,
                is_hidden=False,
                created_at=created_time
            )
            session.add(report)

        # 2. Seed Volunteers
        print(f"Seeding {len(MOCK_VOLUNTEERS)} active community volunteers in Delhi...")
        for v in MOCK_VOLUNTEERS:
            vol = User(
                phone=v["phone"],
                name=v["name"],
                normal_pin="1234",
                duress_pin="9999",
                is_volunteer=True,
                volunteer_available=True,
                last_lat=v["lat"],
                last_lng=v["lng"],
                language="en"
            )
            session.add(vol)

        # 3. Seed Demo Users & Contacts
        print(f"Seeding {len(DEMO_USERS)} demo users with trusted contacts...")
        created_users = []
        for u in DEMO_USERS:
            user = User(
                phone=u["phone"],
                name=u["name"],
                normal_pin=u["normal_pin"],
                duress_pin=u["duress_pin"],
                language="en",
                check_in_timeout=30,
                auto_share_trips=True
            )
            session.add(user)
            await session.flush()
            created_users.append(user)

            for c in u["contacts"]:
                contact = Contact(
                    user_id=user.id,
                    name=c["name"],
                    phone=c["phone"],
                    relationship=c["relationship"],
                    notify_sms=True,
                    notify_whatsapp=True
                )
                session.add(contact)

        # 4. Seed 2 Completed Demo Trips with Breadcrumbs
        primary_user = created_users[0]
        print("Seeding 2 completed past trips with safety score summaries...")
        
        # Trip 1: Connaught Place to Hauz Khas (Safest Route)
        preset_hk = DELHI_PRESET_ROUTES["cp_to_hauzkhas"]["safest"]
        trip1 = Trip(
            user_id=primary_user.id,
            status="COMPLETED",
            origin_name="Connaught Place, Delhi",
            origin_lat=preset_hk[0][0],
            origin_lng=preset_hk[0][1],
            destination_name="Hauz Khas Village, Delhi",
            destination_lat=preset_hk[-1][0],
            destination_lng=preset_hk[-1][1],
            travel_mode="walking",
            route_type="safest",
            planned_route_geometry=json.dumps(preset_hk),
            planned_duration_s=1800,
            planned_distance_m=8200,
            safety_score=89.5,
            tracking_token="demo-trip-token-hk-safe-01",
            token_expires_at=now + timedelta(hours=24),
            start_time=now - timedelta(hours=4),
            end_time=now - timedelta(hours=3, minutes=28)
        )
        session.add(trip1)
        await session.flush()

        # Trip 2: New Delhi Rly to India Gate
        preset_ig = DELHI_PRESET_ROUTES["cp_to_indiagate"]["safest"]
        trip2 = Trip(
            user_id=primary_user.id,
            status="COMPLETED",
            origin_name="New Delhi Railway Station",
            origin_lat=preset_ig[0][0],
            origin_lng=preset_ig[0][1],
            destination_name="India Gate, Rajpath",
            destination_lat=preset_ig[-1][0],
            destination_lng=preset_ig[-1][1],
            travel_mode="walking",
            route_type="safest",
            planned_route_geometry=json.dumps(preset_ig),
            planned_duration_s=900,
            planned_distance_m=3100,
            safety_score=92.0,
            tracking_token="demo-trip-token-ig-safe-02",
            token_expires_at=now + timedelta(hours=24),
            start_time=now - timedelta(days=1, hours=2),
            end_time=now - timedelta(days=1, hours=1, minutes=45)
        )
        session.add(trip2)

        # 5. Seed Initial Mock Message Log
        msg1 = MessageLog(
            recipient_phone="+919811122233",
            channel="SMS",
            title="Trip Started",
            content="SafeRoute Alert: Ananya Sharma started a trip to India Gate in Delhi. Follow live: http://localhost:8000/track/demo-trip-token-ig-safe-02",
            status="MOCKED",
            created_at=now - timedelta(days=1, hours=2)
        )
        msg2 = MessageLog(
            recipient_phone="+919811122233",
            channel="SMS",
            title="Arrived Safely",
            content="SafeRoute: Ananya Sharma has arrived safely at India Gate, Rajpath. Trip ended.",
            status="MOCKED",
            created_at=now - timedelta(days=1, hours=1, minutes=45)
        )
        session.add_all([msg1, msg2])

        await session.commit()
        print("Successfully seeded all Delhi mock demo data.")

if __name__ == "__main__":
    asyncio.run(seed_database())
