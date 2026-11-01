import math
import numpy as np
from enum import Enum
from typing import List, Dict, Any, Optional, Tuple
from sklearn.ensemble import IsolationForest
from backend.app.config import settings
from backend.app.services.osm import haversine_distance, osm_service

class AnomalyState(str, Enum):
    NORMAL = "NORMAL"
    SUSPICIOUS = "SUSPICIOUS"
    CHECK_IN = "CHECK_IN"
    ALERT = "ALERT"

def point_to_segment_distance(p: List[float], a: List[float], b: List[float]) -> float:
    """Perpendicular distance in meters from point p to segment [a, b]."""
    # Flat approximation using local projection for short segments
    lat_mid = (a[0] + b[0]) / 2.0
    deg_lat_to_m = 111139.0
    deg_lon_to_m = 111139.0 * math.cos(math.radians(lat_mid))
    
    px = (p[1] - a[1]) * deg_lon_to_m
    py = (p[0] - a[0]) * deg_lat_to_m
    bx = (b[1] - a[1]) * deg_lon_to_m
    by = (b[0] - a[0]) * deg_lat_to_m
    
    seg_len_sq = bx * bx + by * by
    if seg_len_sq == 0:
        return math.sqrt(px * px + py * py)
        
    t = max(0.0, min(1.0, (px * bx + py * by) / seg_len_sq))
    proj_x = t * bx
    proj_y = t * by
    
    dx = px - proj_x
    dy = py - proj_y
    return math.sqrt(dx * dx + dy * dy)

def min_distance_to_polyline(point: List[float], polyline: List[List[float]]) -> float:
    if len(polyline) < 2:
        return 0.0
    min_dist = float("inf")
    for i in range(len(polyline) - 1):
        dist = point_to_segment_distance(point, polyline[i], polyline[i + 1])
        if dist < min_dist:
            min_dist = dist
    return min_dist

class AnomalyStateMachine:
    def __init__(self):
        self.state = AnomalyState.NORMAL
        self.active_trigger_reason: Optional[str] = None
        self.check_in_started_at: Optional[float] = None
        self.check_in_timeout_s: float = 30.0
        
        # Scikit-learn IsolationForest as supporting ML signal
        self._init_ml_detector()

    def _init_ml_detector(self):
        # Features: [delta_time_s, delta_dist_m, speed_mps, deviation_m]
        # Normal walking/driving patterns
        rng = np.random.RandomState(42)
        normal_samples = []
        for _ in range(300):
            dt = rng.uniform(4.0, 6.0) # 5s updates
            speed = rng.uniform(1.0, 1.6) # walking speed
            dist = speed * dt
            dev = rng.uniform(0.0, 40.0) # mild deviation
            normal_samples.append([dt, dist, speed, dev])
            
        X_train = np.array(normal_samples)
        self.ml_model = IsolationForest(contamination=0.05, random_state=42)
        self.ml_model.fit(X_train)

    def evaluate_ml_anomaly(self, dt: float, dist: float, speed: float, deviation: float) -> Tuple[bool, float]:
        """Returns (is_anomaly, score). Score < 0 indicates anomaly in IsolationForest."""
        sample = np.array([[dt, dist, speed, deviation]])
        pred = self.ml_model.predict(sample)[0] # -1 = anomaly, 1 = normal
        score = float(self.ml_model.decision_function(sample)[0])
        return (pred == -1), score

    def process_update(
        self,
        current_lat: float,
        current_lng: float,
        current_speed: float, # m/s
        prev_speed: float,
        stop_duration_s: float,
        planned_route: List[List[float]],
        destination_lat: float,
        destination_lng: float,
        elapsed_time_s: float,
        planned_duration_s: float,
        accel_magnitude: float = 9.8, # m/s^2
        current_timestamp: float = 0.0
    ) -> Dict[str, Any]:
        """Run anomaly detection and advance state machine."""
        
        # Already in ALERT: persists until resolved
        if self.state == AnomalyState.ALERT:
            return {
                "state": self.state.value,
                "reason": self.active_trigger_reason or "Emergency alert active",
                "triggered": False
            }
            
        # If in CHECK_IN: check if countdown expired
        if self.state == AnomalyState.CHECK_IN:
            if self.check_in_started_at and (current_timestamp - self.check_in_started_at >= self.check_in_timeout_s):
                self.state = AnomalyState.ALERT
                self.active_trigger_reason = f"Check-in timed out after {int(self.check_in_timeout_s)}s with no response"
                return {
                    "state": self.state.value,
                    "reason": self.active_trigger_reason,
                    "triggered": True,
                    "escalated_to_sos": True
                }
            return {
                "state": self.state.value,
                "reason": self.active_trigger_reason,
                "time_remaining_s": max(0.0, self.check_in_timeout_s - (current_timestamp - (self.check_in_started_at or current_timestamp)))
            }

        # Calculate deviation from planned route
        curr_pt = [current_lat, current_lng]
        deviation_m = min_distance_to_polyline(curr_pt, planned_route)
        dist_to_dest_m = haversine_distance(current_lat, current_lng, destination_lat, destination_lng)
        
        # ML signal
        is_ml_anomaly, ml_score = self.evaluate_ml_anomaly(5.0, current_speed * 5.0, current_speed, deviation_m)
        
        # Trigger 1: Route deviation > 150m
        if deviation_m > settings.DEVIATION_THRESHOLD_M:
            self._trigger_check_in(f"Route deviation detected: {round(deviation_m)}m off planned route", current_timestamp)
            return {"state": self.state.value, "reason": self.active_trigger_reason, "triggered": True}
            
        # Trigger 2: Unusual stop > 3 minutes (180s) away from destination and safe POIs
        if stop_duration_s >= settings.STOP_THRESHOLD_S and dist_to_dest_m > 120.0:
            # Check if stopped at known safe POI (hospital, police, transit)
            nearby_safe = osm_service.get_pois_within_radius(current_lat, current_lng, "help", 150.0)
            if not nearby_safe:
                self._trigger_check_in(f"Unusual stop detected: stationary for {int(stop_duration_s)}s in non-designated zone", current_timestamp)
                return {"state": self.state.value, "reason": self.active_trigger_reason, "triggered": True}
                
        # Trigger 3: Sudden speed jump from walk to vehicle (e.g. forced into a car)
        if prev_speed <= settings.SPEED_SPIKE_WALK_MAX and current_speed >= settings.SPEED_SPIKE_VEHICLE_MIN:
            self._trigger_check_in(f"Sudden velocity spike: {round(prev_speed, 1)} m/s -> {round(current_speed, 1)} m/s", current_timestamp)
            return {"state": self.state.value, "reason": self.active_trigger_reason, "triggered": True}
            
        # Trigger 4: Shake / fall spike > 24 m/s^2
        if accel_magnitude >= settings.FALL_SPIKE_ACCEL:
            self._trigger_check_in(f"Severe impact or fall detected ({round(accel_magnitude, 1)} m/s²)", current_timestamp)
            return {"state": self.state.value, "reason": self.active_trigger_reason, "triggered": True}
            
        # Trigger 5: Missed ETA > 10 min (600s)
        if elapsed_time_s > (planned_duration_s + settings.MISSED_ETA_THRESHOLD_S) and dist_to_dest_m > 150.0:
            self._trigger_check_in(f"Trip delayed: exceeded expected ETA by over {int(settings.MISSED_ETA_THRESHOLD_S / 60)} minutes", current_timestamp)
            return {"state": self.state.value, "reason": self.active_trigger_reason, "triggered": True}
            
        # Mild suspicious signal
        if is_ml_anomaly or (deviation_m > 80.0):
            self.state = AnomalyState.SUSPICIOUS
            self.active_trigger_reason = "Mild trajectory variation"
            return {"state": self.state.value, "reason": self.active_trigger_reason, "triggered": False}
            
        # Normal
        self.state = AnomalyState.NORMAL
        self.active_trigger_reason = None
        return {"state": self.state.value, "reason": "All parameters normal", "triggered": False}

    def _trigger_check_in(self, reason: str, timestamp: float):
        self.state = AnomalyState.CHECK_IN
        self.active_trigger_reason = reason
        self.check_in_started_at = timestamp

    def resolve_check_in(self, entered_pin: str, normal_pin: str, duress_pin: str) -> Dict[str, Any]:
        """Handles PIN entered on Check-in screen."""
        if entered_pin == normal_pin:
            self.state = AnomalyState.NORMAL
            self.active_trigger_reason = None
            self.check_in_started_at = None
            return {
                "success": True,
                "state": self.state.value,
                "message": "Check-in confirmed. Safe navigation resumed."
            }
        elif entered_pin == duress_pin:
            # Duress PIN looks like normal dismissal to bystander, but silently triggers ALERT
            self.state = AnomalyState.ALERT
            self.active_trigger_reason = "Silent Duress PIN alert triggered"
            self.check_in_started_at = None
            return {
                "success": True,
                "state": "NORMAL", # Return visual mask to the UI!
                "silent_sos_triggered": True,
                "message": "Check-in dismissed"
            }
        else:
            return {
                "success": False,
                "state": self.state.value,
                "message": "Incorrect PIN"
            }

    def trigger_direct_sos(self, reason: str = "Manual SOS button held"):
        self.state = AnomalyState.ALERT
        self.active_trigger_reason = reason

    def resolve_sos(self, entered_pin: str, normal_pin: str) -> bool:
        if entered_pin == normal_pin:
            self.state = AnomalyState.NORMAL
            self.active_trigger_reason = None
            return True
        return False
