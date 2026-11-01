import json
import os
import math
from typing import List, Dict, Any, Tuple

EARTH_RADIUS_M = 6371000.0

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in meters."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_M * c

class DelhiOSMService:
    def __init__(self):
        curr_dir = os.path.dirname(os.path.abspath(__file__))
        # Look upwards for /data/delhi_osm.json
        candidate1 = os.path.abspath(os.path.join(curr_dir, "..", "..", "..", "data", "delhi_osm.json"))
        candidate2 = os.path.abspath(os.path.join(curr_dir, "..", "..", "data", "delhi_osm.json"))
        self.data_path = candidate1 if os.path.exists(candidate1) else candidate2
        self.pois = {"help": [], "lighting": [], "activity": []}
        self.load_data()

    def load_data(self):
        if os.path.exists(self.data_path):
            try:
                with open(self.data_path, "r", encoding="utf-8") as f:
                    self.pois = json.load(f)
            except Exception as e:
                print(f"Error loading {self.data_path}: {e}")
        else:
            print(f"OSM data file not found at {self.data_path}")

    def get_pois_within_radius(self, lat: float, lng: float, category: str, radius_m: float) -> List[Dict[str, Any]]:
        """Return POIs of a given category within radius_m meters."""
        category_pois = self.pois.get(category, [])
        matches = []
        for p in category_pois:
            dist = haversine_distance(lat, lng, p["lat"], p["lng"])
            if dist <= radius_m:
                matches.append({**p, "distance_m": round(dist, 1)})
        return matches

    def count_within_radius(self, lat: float, lng: float, category: str, radius_m: float) -> int:
        category_pois = self.pois.get(category, [])
        count = 0
        for p in category_pois:
            if haversine_distance(lat, lng, p["lat"], p["lng"]) <= radius_m:
                count += 1
        return count

    def get_all_safe_havens(self) -> List[Dict[str, Any]]:
        """Return all emergency help points (police, hospitals, 24x7 pharmacies)"""
        return self.pois.get("help", [])

    def get_all_lighting(self) -> List[Dict[str, Any]]:
        return self.pois.get("lighting", [])

    def get_all_activity(self) -> List[Dict[str, Any]]:
        return self.pois.get("activity", [])

osm_service = DelhiOSMService()
