import pytest
import math
from datetime import datetime, timedelta
from backend.app.services.osm import haversine_distance, osm_service
from backend.app.services.scoring import resample_polyline, scoring_engine
from backend.app.services.anomaly import AnomalyStateMachine, AnomalyState, min_distance_to_polyline

def test_haversine_distance():
    # India Gate to Connaught Place is approx 2.4 - 2.8 km
    ig_lat, ig_lng = 28.6129, 77.2295
    cp_lat, cp_lng = 28.6328, 77.2197
    dist = haversine_distance(ig_lat, ig_lng, cp_lat, cp_lng)
    assert 2200 <= dist <= 3000, f"Expected ~2500m, got {dist}m"

def test_polyline_resampling():
    raw_coords = [
        [28.6328, 77.2197],
        [28.6129, 77.2295]
    ]
    resampled = resample_polyline(raw_coords, step_m=50.0)
    # Total distance is ~2400m, so ~48 segments (resampled points >= 40)
    assert len(resampled) >= 35, f"Expected >= 35 resampled points, got {len(resampled)}"
    assert resampled[0] == raw_coords[0]
    assert resampled[-1] == raw_coords[-1]

def test_scoring_engine_day_vs_night():
    sample_route = [
        [28.6328, 77.2197],
        [28.6250, 77.2240],
        [28.6129, 77.2295]
    ]
    day_eval = scoring_engine.evaluate_route(sample_route, is_night=False)
    night_eval = scoring_engine.evaluate_route(sample_route, is_night=True)
    
    assert "safety_score" in day_eval
    assert "segments" in day_eval
    assert "breakdown" in day_eval
    assert "weakest_stretch" in day_eval
    
    # Night multiplier should produce lower safety score than day
    assert night_eval["safety_score"] < day_eval["safety_score"], "Night score should be lower than day score"
    assert night_eval["breakdown"]["night_multiplier"] == 0.7

def test_scoring_engine_incident_penalty():
    sample_route = [
        [28.6328, 77.2197],
        [28.6200, 77.2200],
        [28.6129, 77.2295]
    ]
    # No incidents
    clean_eval = scoring_engine.evaluate_route(sample_route, is_night=False, incident_reports=[])
    
    # High severity incident right in the middle
    incidents = [{
        "lat": 28.6200,
        "lng": 77.2200,
        "category": "poor_lighting",
        "severity": 3,
        "created_at": datetime.utcnow()
    }]
    incident_eval = scoring_engine.evaluate_route(sample_route, is_night=False, incident_reports=incidents)
    
    assert incident_eval["safety_score"] < clean_eval["safety_score"], "Incidents should penalize score"
    assert incident_eval["breakdown"]["incident_penalty"] > 0

def test_anomaly_state_machine_normal():
    sm = AnomalyStateMachine()
    planned_route = [
        [28.6328, 77.2197],
        [28.6250, 77.2240],
        [28.6129, 77.2295]
    ]
    res = sm.process_update(
        current_lat=28.6328,
        current_lng=77.2197,
        current_speed=1.3,
        prev_speed=1.3,
        stop_duration_s=0.0,
        planned_route=planned_route,
        destination_lat=28.6129,
        destination_lng=77.2295,
        elapsed_time_s=60.0,
        planned_duration_s=600.0,
        accel_magnitude=9.8
    )
    assert sm.state == AnomalyState.NORMAL
    assert not res["triggered"]

def test_anomaly_state_machine_route_deviation():
    sm = AnomalyStateMachine()
    planned_route = [
        [28.6328, 77.2197],
        [28.6129, 77.2295]
    ]
    # Deviate > 250m off route
    res = sm.process_update(
        current_lat=28.6328,
        current_lng=77.2300, # ~1 km east
        current_speed=1.3,
        prev_speed=1.3,
        stop_duration_s=0.0,
        planned_route=planned_route,
        destination_lat=28.6129,
        destination_lng=77.2295,
        elapsed_time_s=120.0,
        planned_duration_s=600.0,
        current_timestamp=100.0
    )
    assert sm.state == AnomalyState.CHECK_IN
    assert res["triggered"] is True
    assert "deviation" in res["reason"].lower()

def test_anomaly_state_machine_unusual_stop():
    sm = AnomalyStateMachine()
    planned_route = [[28.6328, 77.2197], [28.6129, 77.2295]]
    # Stop for 200 seconds (> 180s threshold) far from destination
    res = sm.process_update(
        current_lat=28.6250,
        current_lng=77.2240,
        current_speed=0.0,
        prev_speed=0.0,
        stop_duration_s=200.0,
        planned_route=planned_route,
        destination_lat=28.6129,
        destination_lng=77.2295,
        elapsed_time_s=250.0,
        planned_duration_s=600.0,
        current_timestamp=200.0
    )
    assert sm.state == AnomalyState.CHECK_IN
    assert "stop" in res["reason"].lower()

def test_anomaly_state_machine_speed_spike():
    sm = AnomalyStateMachine()
    planned_route = [[28.6328, 77.2197], [28.6129, 77.2295]]
    # Sudden speed jump: 1.2 m/s -> 10.5 m/s (vehicle jump)
    res = sm.process_update(
        current_lat=28.6250,
        current_lng=77.2240,
        current_speed=10.5,
        prev_speed=1.2,
        stop_duration_s=0.0,
        planned_route=planned_route,
        destination_lat=28.6129,
        destination_lng=77.2295,
        elapsed_time_s=150.0,
        planned_duration_s=600.0,
        current_timestamp=300.0
    )
    assert sm.state == AnomalyState.CHECK_IN
    assert "velocity" in res["reason"].lower() or "spike" in res["reason"].lower()

def test_anomaly_state_machine_fall_spike():
    sm = AnomalyStateMachine()
    planned_route = [[28.6328, 77.2197], [28.6129, 77.2295]]
    res = sm.process_update(
        current_lat=28.6328,
        current_lng=77.2197,
        current_speed=1.2,
        prev_speed=1.2,
        stop_duration_s=0.0,
        planned_route=planned_route,
        destination_lat=28.6129,
        destination_lng=77.2295,
        elapsed_time_s=50.0,
        planned_duration_s=600.0,
        accel_magnitude=28.5, # > 24 m/s^2
        current_timestamp=400.0
    )
    assert sm.state == AnomalyState.CHECK_IN
    assert "fall" in res["reason"].lower() or "impact" in res["reason"].lower()

def test_anomaly_check_in_pin_resolution():
    sm = AnomalyStateMachine()
    sm.state = AnomalyState.CHECK_IN
    
    # 1. Incorrect PIN
    wrong_res = sm.resolve_check_in("0000", normal_pin="1234", duress_pin="9999")
    assert wrong_res["success"] is False
    assert sm.state == AnomalyState.CHECK_IN
    
    # 2. Normal PIN
    normal_res = sm.resolve_check_in("1234", normal_pin="1234", duress_pin="9999")
    assert normal_res["success"] is True
    assert sm.state == AnomalyState.NORMAL

def test_anomaly_check_in_duress_pin():
    sm = AnomalyStateMachine()
    sm.state = AnomalyState.CHECK_IN
    
    # Duress PIN entered: visually masks as success to user, but internally escalates to ALERT!
    duress_res = sm.resolve_check_in("9999", normal_pin="1234", duress_pin="9999")
    assert duress_res["success"] is True
    assert duress_res.get("silent_sos_triggered") is True
    assert sm.state == AnomalyState.ALERT

def test_anomaly_check_in_timeout_escalation():
    sm = AnomalyStateMachine()
    planned_route = [[28.6328, 77.2197], [28.6129, 77.2295]]
    # Trigger check-in at t = 1000s
    sm.process_update(
        current_lat=28.6328,
        current_lng=77.2350, # deviation
        current_speed=1.0,
        prev_speed=1.0,
        stop_duration_s=0.0,
        planned_route=planned_route,
        destination_lat=28.6129,
        destination_lng=77.2295,
        elapsed_time_s=100.0,
        planned_duration_s=600.0,
        current_timestamp=1000.0
    )
    assert sm.state == AnomalyState.CHECK_IN
    
    # Advance time by 35 seconds (past 30s timeout)
    timeout_res = sm.process_update(
        current_lat=28.6328,
        current_lng=77.2350,
        current_speed=1.0,
        prev_speed=1.0,
        stop_duration_s=0.0,
        planned_route=planned_route,
        destination_lat=28.6129,
        destination_lng=77.2295,
        elapsed_time_s=135.0,
        planned_duration_s=600.0,
        current_timestamp=1035.0
    )
    assert sm.state == AnomalyState.ALERT
    assert timeout_res.get("escalated_to_sos") is True
