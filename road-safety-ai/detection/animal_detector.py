"""
Animal Detection and Collision Trajectory Analysis Module
Analyzes animal detections and temporal tracking data to:
- Identify animal species and size (dog, cat, cow, buffalo, goat)
- Classify behavior state: STANDING, SLEEPING, CROSSING, APPROACHING
- Detect road occupancy (within driving corridor vs on roadside shoulder)
- Estimate collision trajectory and Time-To-Impact
"""

import numpy as np
from dataclasses import dataclass
from typing import List, Dict, Any, Tuple, Optional

@dataclass
class AnimalHazard:
    track_id: int
    bbox: Tuple[int, int, int, int]  # (x1, y1, x2, y2)
    confidence: float
    species_guess: str  # 'LARGE_CATTLE' (cow/buffalo), 'MEDIUM_LIVESTOCK' (goat/sheep), 'CANINE_FELINE' (dog/cat)
    behavior_state: str  # 'CROSSING', 'STANDING', 'SLEEPING', 'APPROACHING'
    lane_position: str  # 'IN_LANE', 'ROAD_SHOULDER', 'PERIPHERY'
    velocity_vector: Tuple[float, float]  # (vx_px_per_sec, vy_px_per_sec)
    collision_risk: str  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    collision_probability: float  # 0.0 to 1.0 (physics-based, distinct from detection confidence!)

class AnimalDetector:
    def __init__(
        self,
        lane_corridor_ratio: Tuple[float, float] = (0.20, 0.80), # central 60% of road width is active driving lane
        crossing_speed_threshold_px: float = 25.0, # px/sec horizontal speed
        approaching_expansion_ratio: float = 1.08  # bounding box expansion rate per second
    ):
        self.lane_left = lane_corridor_ratio[0]
        self.lane_right = lane_corridor_ratio[1]
        self.crossing_speed_thresh = crossing_speed_threshold_px
        self.approaching_ratio = approaching_expansion_ratio

    def analyze_animals(
        self,
        frame_shape: Tuple[int, int],
        tracked_animals: List[Dict[str, Any]]
    ) -> List[AnimalHazard]:
        """
        tracked_animals item:
        {
            'track_id': int,
            'bbox': [x1, y1, x2, y2],
            'confidence': float,
            'velocity': (vx, vy), # px per sec
            'history': [(cx, cy), ...],
            'area_history': [area_t0, area_t1, ...]
        }
        """
        h, w = frame_shape[:2]
        hazards = []

        for item in tracked_animals:
            track_id = item.get('track_id', -1)
            bbox = tuple(int(v) for v in item['bbox'])
            x1, y1, x2, y2 = bbox
            conf = float(item.get('confidence', 0.85))
            vx, vy = item.get('velocity', (0.0, 0.0))
            history = item.get('history', [])
            area_hist = item.get('area_history', [])

            box_w = max(1, x2 - x1)
            box_h = max(1, y2 - y1)
            area = box_w * box_h
            cx = (x1 + x2) / 2.0
            norm_cx = cx / float(w)
            norm_y2 = y2 / float(h)

            # 1. Species & Size Guess (aspect ratio + physical scale in frame)
            aspect_ratio = float(box_w) / float(box_h)
            if area > 18000 or (box_h > 140 and aspect_ratio > 1.1):
                species = "LARGE_CATTLE"  # Cow, buffalo, bull
            elif area > 6000 or box_h > 80:
                species = "MEDIUM_LIVESTOCK"  # Goat, sheep
            else:
                species = "CANINE_FELINE"  # Stray dog, cat

            # 2. Lane Position Determination
            if self.lane_left <= norm_cx <= self.lane_right and norm_y2 > 0.45:
                lane_pos = "IN_LANE"
            elif 0.08 <= norm_cx <= 0.92:
                lane_pos = "ROAD_SHOULDER"
            else:
                lane_pos = "PERIPHERY"

            # 3. Behavior Classification
            # Analyze velocity and aspect ratio for sleeping (low height, wide aspect, zero velocity)
            speed = np.hypot(vx, vy)
            if speed < 8.0:
                if aspect_ratio > 1.8 and norm_y2 > 0.5:
                    behavior = "SLEEPING"
                else:
                    behavior = "STANDING"
            elif abs(vx) > self.crossing_speed_thresh:
                behavior = "CROSSING"
            elif vy > 15.0 or (len(area_hist) >= 3 and (area_hist[-1] / max(1, area_hist[0])) > 1.15):
                behavior = "APPROACHING"
            else:
                behavior = "STANDING"

            # 4. Physics-Informed Collision Probability & Risk Level
            # Never confuse detection confidence with collision risk!
            # Proximity factor: how close to vehicle (higher y2 is closer)
            proximity = min(1.0, norm_y2 ** 1.8)
            
            # Trajectory factor: is it heading into or currently in the ego-lane?
            in_path = 1.0 if lane_pos == "IN_LANE" else (0.5 if lane_pos == "ROAD_SHOULDER" else 0.1)
            
            # Action hazard factor
            action_factor = 0.5
            if behavior == "CROSSING" and lane_pos != "PERIPHERY":
                action_factor = 0.85
            elif behavior == "APPROACHING":
                action_factor = 0.95
            elif behavior in ("STANDING", "SLEEPING") and lane_pos == "IN_LANE":
                action_factor = 0.90
            elif behavior in ("STANDING", "SLEEPING") and lane_pos == "ROAD_SHOULDER":
                action_factor = 0.45

            # Size multiplier (large cattle poses fatal collision risk)
            size_weight = 1.0 if species == "LARGE_CATTLE" else (0.8 if species == "MEDIUM_LIVESTOCK" else 0.6)

            collision_prob = round(min(1.0, (0.45 * in_path + 0.35 * proximity + 0.20 * action_factor) * size_weight), 3)

            # Assign categorical risk
            if collision_prob >= 0.70 or (lane_pos == "IN_LANE" and norm_y2 > 0.70):
                risk_level = "CRITICAL"
            elif collision_prob >= 0.45 or (lane_pos == "IN_LANE"):
                risk_level = "HIGH"
            elif collision_prob >= 0.25 or (lane_pos == "ROAD_SHOULDER"):
                risk_level = "MEDIUM"
            else:
                risk_level = "LOW"

            hazard = AnimalHazard(
                track_id=track_id,
                bbox=bbox,
                confidence=conf,
                species_guess=species,
                behavior_state=behavior,
                lane_position=lane_pos,
                velocity_vector=(round(vx, 2), round(vy, 2)),
                collision_risk=risk_level,
                collision_probability=collision_prob
            )
            hazards.append(hazard)

        return hazards
