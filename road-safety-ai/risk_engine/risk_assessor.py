"""
Intelligent Risk Assessment Engine
Evaluates road hazards using physical context, kinematics, and spatial trajectory:
- 4 Categorical Levels: LOW, MEDIUM, HIGH, CRITICAL
- Collision corridor geometry (ego-vehicle path polygon)
- Time-To-Collision (TTC = distance / relative_speed)
- Distinct separation of Detection Confidence from Collision Probability
- Multi-factor risk scoring: Hazard Type, Size, Proximity, Trajectory, Persistence
"""

import numpy as np
from dataclasses import dataclass
from typing import Dict, Any, List, Tuple, Optional

@dataclass
class RiskEvaluation:
    hazard_id: str
    hazard_type: str  # 'POTHOLE', 'ANIMAL', 'ACCIDENT', 'SHARP_CURVE', 'PEDESTRIAN', 'DEBRIS'
    risk_level: str   # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    risk_score: float # 0.0 to 1.0 overall composite physical risk
    detection_confidence: float # Machine learning perception certainty
    collision_probability: float # Kinematic collision likelihood
    estimated_distance_meters: float
    time_to_collision_sec: Optional[float]
    recommended_action: str
    in_ego_path: bool
    explanation: str

class RiskAssessmentEngine:
    def __init__(
        self,
        default_vehicle_speed_kmh: float = 60.0,
        critical_ttc_sec: float = 2.0,
        high_ttc_sec: float = 4.0,
        ego_corridor_ratio: Tuple[float, float] = (0.28, 0.72)
    ):
        self.veh_speed_mps = default_vehicle_speed_kmh / 3.6
        self.critical_ttc = critical_ttc_sec
        self.high_ttc = high_ttc_sec
        self.ego_left = ego_corridor_ratio[0]
        self.ego_right = ego_corridor_ratio[1]

    def evaluate_hazard(
        self,
        hazard_type: str,
        bbox: Tuple[int, int, int, int],
        confidence: float,
        frame_shape: Tuple[int, int],
        velocity_vector: Tuple[float, float] = (0.0, 0.0),
        persistence_frames: int = 1,
        additional_metrics: Optional[Dict[str, Any]] = None
    ) -> RiskEvaluation:
        """
        Evaluates risk based on physics, distance, trajectory, and hazard nature.
        IMPORTANT: Confidence is preserved as perception certainty, but risk_score
        and collision_probability are computed strictly from spatial and kinematic factors.
        """
        h, w = frame_shape[:2]
        x1, y1, x2, y2 = bbox
        metrics = additional_metrics or {}

        # 1. Spatial Geometry on Road
        cx = (x1 + x2) / 2.0
        norm_cx = cx / float(w)
        norm_y2 = y2 / float(h)
        box_w = max(1, x2 - x1)
        box_h = max(1, y2 - y1)
        area_ratio = (box_w * box_h) / float(w * h)

        # Distance estimation: optical ground contact point (y2)
        # Assuming camera mounted at ~1.3m height, horizon at h * 0.55
        horizon_y = h * 0.55
        delta_y = max(1.0, y2 - horizon_y)
        est_distance_m = round(float(np.clip(1.3 * (h * 0.45) / delta_y, 2.5, 85.0)), 1)

        # In ego driving corridor?
        # Ego corridor expands towards bottom of frame (trapezoidal perspective)
        t = norm_y2
        lane_w_at_y = self.ego_left + (1.0 - t) * 0.08
        lane_r_at_y = self.ego_right - (1.0 - t) * 0.08
        in_ego_path = (lane_w_at_y <= norm_cx <= lane_r_at_y)

        # 2. Kinematic Time-To-Collision (TTC)
        vx, vy = velocity_vector
        # vy > 0 means closing distance towards camera
        approach_speed_mps = self.veh_speed_mps + max(0.0, (vy / float(h)) * 30.0)
        ttc = round(est_distance_m / max(0.5, approach_speed_mps), 2) if in_ego_path else None

        # 3. Collision Probability Calculation (Distinct from Detection Confidence)
        if in_ego_path:
            lateral_risk = 1.0
        else:
            dist_to_center = abs(norm_cx - 0.5)
            lateral_risk = max(0.0, 1.0 - dist_to_center * 2.2)

        proximity_risk = min(1.0, (norm_y2 - 0.40) / 0.55) if norm_y2 > 0.40 else 0.05
        
        # Trajectory heading risk (is object moving into ego lane?)
        trajectory_risk = 0.5
        if not in_ego_path:
            if norm_cx < 0.5 and vx > 5.0:  # Moving from left into path
                trajectory_risk = 0.85
            elif norm_cx > 0.5 and vx < -5.0:  # Moving from right into path
                trajectory_risk = 0.85

        collision_prob = round(float(np.clip(
            (0.50 * lateral_risk) + (0.35 * proximity_risk) + (0.15 * trajectory_risk),
            0.02, 0.99
        )), 2)

        # 4. Hazard-Specific Severity and Action Generation
        ht_upper = hazard_type.upper()
        
        if "ACCIDENT" in ht_upper or "COLLISION" in ht_upper:
            base_risk = 0.90
            action = "EMERGENCY: Accident ahead! Brake immediately and prepare to steer clear."
            explanation = "Active collision / overturned vehicle blocking carriageway."
        elif "ANIMAL" in ht_upper:
            species = metrics.get('species_guess', 'ANIMAL')
            behavior = metrics.get('behavior_state', 'CROSSING')
            base_risk = 0.70 if in_ego_path else 0.40
            action = "Reduce speed and maintain a safe distance. Watch for sudden animal movement."
            explanation = f"{species} detected in {behavior} state ({'in active lane' if in_ego_path else 'near shoulder'})."
        elif "POTHOLE" in ht_upper:
            pothole_sev = metrics.get('severity_score', 0.5)
            is_clustered = metrics.get('is_clustered', False)
            base_risk = 0.35 + (0.45 * pothole_sev)
            if is_clustered:
                base_risk = min(0.95, base_risk * 1.2)
                action = "Slow down and avoid sudden steering! Multiple potholes clustered in lane."
                explanation = f"Pothole cluster ({metrics.get('cluster_count', 2)} potholes) with depth severity {pothole_sev:.2f}."
            else:
                action = "Slow down and avoid sudden steering."
                explanation = f"Pothole detected with severity index {pothole_sev:.2f}."
        elif "PEDESTRIAN" in ht_upper:
            base_risk = 0.85 if in_ego_path else 0.55
            action = "Caution: Pedestrian crossing! Yield right-of-way and prepare to stop."
            explanation = f"Pedestrian detected at {est_distance_m}m in forward corridor."
        elif "CURVE" in ht_upper or "TURN" in ht_upper:
            radius = metrics.get('radius_meters', 300.0)
            blind = metrics.get('is_blind_curve', False)
            base_risk = 0.85 if blind else (0.75 if radius < 150 else 0.45)
            speed_rec = metrics.get('recommended_safe_speed_kmh', 40)
            action = f"Sharp curve ahead! Reduce speed to under {speed_rec} km/h."
            explanation = f"Curve radius {radius}m ({'BLIND CURVE' if blind else 'sharp turn'})."
        else: # Debris / general obstacle
            base_risk = 0.60 if in_ego_path else 0.30
            action = "Obstacle on road. Slow down and maneuver safely."
            explanation = f"Road obstacle detected at {est_distance_m}m."

        # Composite physical risk score (0.0 to 1.0)
        composite_risk = float(np.clip(
            (0.40 * base_risk) + (0.40 * collision_prob) + (0.20 * min(1.0, persistence_frames / 10.0)),
            0.05, 1.0
        ))

        # 5. Categorize into LOW, MEDIUM, HIGH, CRITICAL
        if ttc is not None and ttc < self.critical_ttc:
            risk_level = "CRITICAL"
        elif composite_risk >= 0.75 or (in_ego_path and est_distance_m < 15.0):
            risk_level = "CRITICAL"
        elif composite_risk >= 0.50 or (ttc is not None and ttc < self.high_ttc) or in_ego_path:
            risk_level = "HIGH"
        elif composite_risk >= 0.25 or est_distance_m < 35.0:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        return RiskEvaluation(
            hazard_id=metrics.get('hazard_id', f"hz_{x1}_{y1}"),
            hazard_type=ht_upper,
            risk_level=risk_level,
            risk_score=round(composite_risk, 3),
            detection_confidence=round(float(confidence), 2),
            collision_probability=round(collision_prob, 2),
            estimated_distance_meters=est_distance_m,
            time_to_collision_sec=ttc,
            recommended_action=action,
            in_ego_path=in_ego_path,
            explanation=explanation
        )
