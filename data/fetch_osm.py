"""
Overpass API script to fetch Delhi safety-related POIs:
- Street lighting & illuminated highways
- Commercial activity (shops, restaurants, transit hubs)
- Emergency Help (police stations, hospitals, 24x7 pharmacies)

Usage:
  python data/fetch_osm.py
"""

import json
import os
import httpx

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Delhi NCR Bounding Box [min_lat, min_lon, max_lat, max_lon]
BBOX = "28.40,76.85,28.88,77.40"

OVERPASS_QUERY = f"""
[out:json][timeout:60];
(
  // Police & Help
  node["amenity"="police"]({BBOX});
  node["amenity"="hospital"]({BBOX});
  node["amenity"="pharmacy"]["opening_hours"="24/7"]({BBOX});
  
  // Transit Hubs & Active Stations
  node["railway"="subway_entrance"]({BBOX});
  node["railway"="station"]({BBOX});
  node["highway"="bus_stop"]({BBOX});
  
  // Lighting
  node["highway"="street_lamp"]({BBOX});
  way["lit"="yes"]({BBOX});
  
  // Commercial Activity
  node["amenity"="restaurant"]({BBOX});
  node["shop"="convenience"]({BBOX});
  node["shop"="supermarket"]({BBOX});
);
out center 500;
"""

def fetch_osm_data():
    print(f"Fetching Delhi OSM POIs from Overpass API (bbox: {BBOX})...")
    try:
        response = httpx.post(OVERPASS_URL, data={"data": OVERPASS_QUERY}, timeout=45.0)
        response.raise_for_status()
        data = response.json()
        print(f"Successfully fetched {len(data.get('elements', []))} raw OSM elements.")
        
        # Categorize
        categorized = {
            "lighting": [],
            "activity": [],
            "help": []
        }
        
        for elem in data.get("elements", []):
            lat = elem.get("lat") or (elem.get("center", {}).get("lat") if "center" in elem else None)
            lon = elem.get("lon") or (elem.get("center", {}).get("lon") if "center" in elem else None)
            if not lat or not lon:
                continue
                
            tags = elem.get("tags", {})
            name = tags.get("name", "")
            
            if tags.get("amenity") in ("police", "hospital") or tags.get("emergency") or (tags.get("amenity") == "pharmacy" and tags.get("opening_hours") == "24/7"):
                categorized["help"].append({
                    "lat": lat,
                    "lng": lon,
                    "type": tags.get("amenity", "help"),
                    "name": name or tags.get("amenity", "Help Location")
                })
            elif tags.get("highway") == "street_lamp" or tags.get("lit") == "yes":
                categorized["lighting"].append({
                    "lat": lat,
                    "lng": lon,
                    "type": "street_lamp"
                })
            else:
                categorized["activity"].append({
                    "lat": lat,
                    "lng": lon,
                    "type": tags.get("shop") or tags.get("amenity") or tags.get("railway", "activity"),
                    "name": name or "Active Commercial Spot"
                })
                
        output_file = os.path.join(os.path.dirname(__file__), "delhi_osm.json")
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(categorized, f, indent=2)
        print(f"Saved categorized POIs to {output_file}")
        return True
    except Exception as e:
        print(f"Overpass API error: {e}. Using bundled/trimmed Delhi OSM dataset.")
        return False

if __name__ == "__main__":
    fetch_osm_data()
