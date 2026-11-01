import math
import numpy as np
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from backend.app.config import settings
from backend.app.services.osm import osm_service, haversine_distance

def resample_polyline(coords: List[List[float]], step_m: float = 50.0) -> List[List[float]]:
    """Resample a list of [lat, lng] coordinates so points are spaced roughly step_m apart."""
    if len(coords) < 2:
        return coords
    
    resampled = [coords[0]]
    accumulated = 0.0
    
    for i in range(len(coords) - 1):
        p1 = coords[i]
        p2 = coords[i + 1]
        dist = haversine_distance(p1[0], p1[1], p2[0], p2[1])
        if dist == 0:
            continue
            
        remaining_in_segment = dist
        curr_p = p1
        
        while accumulated + remaining_in_segment >= step_m:
            fraction = (step_m - accumulated) / remaining_in_segment
            next_lat = curr_p[0] + fraction * (p2[0] - curr_p[0])
            next_lng = curr_p[1] + fraction * (p2[1] - curr_p[1])
            resampled.append([round(next_lat, 6), round(next_lng, 6)])
            
            remaining_in_segment -= (step_m - accumulated)
            curr_p = [next_lat, next_lng]
            accumulated = 0.0
            
        accumulated += remaining_in_segment
        
    if coords[-1] != resampled[-1]:
        resampled.append(coords[-1])
        
    return resampled

class SafetyScoringEngine:
    def __init__(self):
        self.w_lighting = settings.WEIGHT_LIGHTING
        self.w_activity = settings.WEIGHT_ACTIVITY
        self.w_help = settings.WEIGHT_HELP
        self.w_incident = settings.WEIGHT_INCIDENT
        self.night_multiplier = settings.NIGHT_MULTIPLIER

    def calculate_lighting_score(self, lat: float, lng: float) -> float:
        """Street lights within 50m. 1 light -> 50, 2+ -> 100."""
        count = osm_service.count_within_radius(lat, lng, "lighting", 75.0)
        if count >= 2:
            return 100.0
        elif count == 1:
            return 60.0
        return 15.0 # baseline ambient

    def calculate_activity_score(self, lat: float, lng: float) -> float:
        """Commercial footfall and active transit within 100m."""
        count = osm_service.count_within_radius(lat, lng, "activity", 120.0)
        if count >= 3:
            return 100.0
        elif count == 2:
            return 75.0
        elif count == 1:
            return 45.0
        return 20.0

    def calculate_help_score(self, lat: float, lng: float) -> float:
        """Police stations, hospitals, 24x7 pharmacies within 500m."""
        pois = osm_service.get_pois_within_radius(lat, lng, "help", 550.0)
        if not pois:
            return 15.0
        min_dist = min(p["distance_m"] for p in pois)
        # Closer help gets higher score
        if min_dist <= 200.0:
            return 100.0
        elif min_dist <= 400.0:
            return 80.0
        return 50.0

    def calculate_incident_penalty(self, lat: float, lng: float, incident_reports: List[Dict[str, Any]]) -> Tuple[float, List[str]]:
        """Time-decayed penalty for incidents within 200m."""
        total_penalty = 0.0
        reasons = []
        now = datetime.utcnow()
        
        for inc in incident_reports:
            dist = haversine_distance(lat, lng, inc["lat"], inc["lng"])
            if dist <= 200.0:
                created_at = inc.get("created_at")
                if isinstance(created_at, str):
                    try:
                        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                    except Exception:
                        created_at = now
                elif not created_at:
                    created_at = now
                    
                days_ago = max(0.0, (now - created_at.replace(tzinfo=None)).total_seconds() / 86400.0)
                # Exponential decay over 7 days: e^(-days / 7.0)
                decay = math.exp(-days_ago / 7.0)
                severity_mult = inc.get("severity", 2) * 15.0 # 15, 30, 45
                distance_weight = (200.0 - dist) / 200.0
                penalty = severity_mult * decay * distance_weight
                total_penalty += penalty
                
                cat = inc.get("category", "incident").replace("_", " ")
                reasons.append(f"{cat} report {round(dist)}m away")
                
        return min(100.0, total_penalty), reasons

    def score_segment(self, lat: float, lng: float, is_night: bool, incident_reports: List[Dict[str, Any]]) -> Dict[str, Any]:
        l_score = self.calculate_lighting_score(lat, lng)
        a_score = self.calculate_activity_score(lat, lng)
        h_score = self.calculate_help_score(lat, lng)
        i_penalty, reasons = self.calculate_incident_penalty(lat, lng, incident_reports)
        
        # Raw score formula
        raw = (self.w_lighting * l_score + 
               self.w_activity * a_score + 
               self.w_help * h_score - 
               self.w_incident * i_penalty)
               
        multiplier = self.night_multiplier if is_night else 1.0
        final_score = max(0.0, min(100.0, raw * multiplier))
        
        if final_score >= 75.0:
            category = "safe"
        elif final_score >= 50.0:
            category = "caution"
        else:
            category = "danger"
            
        return {
            "score": round(final_score, 1),
            "category": category,
            "lighting": round(l_score, 1),
            "activity": round(a_score, 1),
            "help": round(h_score, 1),
            "incident": round(i_penalty, 1),
            "reasons": reasons
        }

    def evaluate_route(self, raw_coords: List[List[float]], is_night: bool = False, incident_reports: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        if incident_reports is None:
            incident_reports = []
            
        points = resample_polyline(raw_coords, step_m=settings.SEGMENT_SAMPLE_DIST_M)
        if len(points) < 2:
            points = raw_coords
            
        segment_details = []
        colored_segments = []
        scores = []
        
        for i in range(len(points) - 1):
            p1 = points[i]
            p2 = points[i + 1]
            mid_lat = (p1[0] + p2[0]) / 2.0
            mid_lng = (p1[1] + p2[1]) / 2.0
            
            detail = self.score_segment(mid_lat, mid_lng, is_night, incident_reports)
            segment_details.append(detail)
            scores.append(detail["score"])
            
            colored_segments.append({
                "coordinates": [p1, p2],
                "score": detail["score"],
                "category": detail["category"]
            })
            
        # Route score = mean - 0.5 * std
        if not scores:
            scores = [80.0]
            
        mean_score = float(np.mean(scores))
        std_score = float(np.std(scores))
        route_score = max(5.0, min(99.0, mean_score - 0.5 * std_score))
        
        # Breakdown averages
        avg_l = float(np.mean([d["lighting"] for d in segment_details])) if segment_details else 70.0
        avg_a = float(np.mean([d["activity"] for d in segment_details])) if segment_details else 65.0
        avg_h = float(np.mean([d["help"] for d in segment_details])) if segment_details else 60.0
        avg_i = float(np.mean([d["incident"] for d in segment_details])) if segment_details else 10.0
        
        # Identify weakest stretch (window of up to 3 segments with lowest score)
        weakest_stretch = None
        if len(scores) >= 1:
            window_size = min(3, len(scores))
            min_window_avg = 999.0
            min_window_idx = 0
            
            for i in range(len(scores) - window_size + 1):
                window_avg = sum(scores[i:i + window_size]) / window_size
                if window_avg < min_window_avg:
                    min_window_avg = window_avg
                    min_window_idx = i
                    
            start_pt = points[min_window_idx]
            end_pt = points[min_window_idx + window_size]
            
            # Formulate rationale
            weak_details = segment_details[min_window_idx:min_window_idx + window_size]
            collected_reasons = []
            for d in weak_details:
                collected_reasons.extend(d["reasons"])
                
            if collected_reasons:
                reason_str = f"Weak stretch: {collected_reasons[0]}"
            elif min_window_avg < 50.0:
                reason_str = "Dimly lit stretch with sparse footfall and distant emergency help"
            elif min_window_avg < 70.0:
                reason_str = "Moderate lighting with low late-night commercial activity"
            else:
                reason_str = "Minor drop in street lighting coverage"
                
            weakest_stretch = {
                "start_index": min_window_idx,
                "end_index": min_window_idx + window_size,
                "start_lat": start_pt[0],
                "start_lng": start_pt[1],
                "end_lat": end_pt[0],
                "end_lng": end_pt[1],
                "score": round(min_window_avg, 1),
                "reason": reason_str
            }
            
        return {
            "safety_score": round(route_score, 1),
            "breakdown": {
                "lighting": round(avg_l, 1),
                "activity": round(avg_a, 1),
                "help_density": round(avg_h, 1),
                "incident_penalty": round(avg_i, 1),
                "night_multiplier": self.night_multiplier if is_night else 1.0
            },
            "segments": colored_segments,
            "weakest_stretch": weakest_stretch
        }

scoring_engine = SafetyScoringEngine()
