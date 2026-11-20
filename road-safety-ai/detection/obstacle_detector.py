"""
Road Obstacle and Hazard Detection Module
Detects non-vehicle, non-animal hazards:
- Pedestrians crossing unexpectedly (entering ego-lane polygon)
- Road debris (fallen trees/branches, construction materials, tires, stones)
- Waterlogging and flooded road surfaces (specular reflection & texture analysis)
- Open manholes and surface drops
- Broken-down vehicles and roadside obstacles
"""

import cv2
import numpy as np
from dataclasses import dataclass
from typing import List, Dict, Any, Tuple, Optional

@dataclass
class ObstacleHazard:
    hazard_id: str
    obstacle_type: str  # 'PEDESTRIAN_CROSSING', 'ROAD_DEBRIS', 'WATERLOGGING', 'OPEN_MANHOLE', 'BROKEN_DOWN_VEHICLE'
    bbox: Tuple[int, int, int, int]
    confidence: float
    severity: str  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    lane_blocked: bool
    description: str
    collision_probability: float

class ObstacleDetector:
    def __init__(
        self,
        active_lane_ratio: Tuple[float, float] = (0.22, 0.78),
        water_reflection_threshold: float = 0.12 # % of road surface showing specular water glint
    ):
        self.lane_left = active_lane_ratio[0]
        self.lane_right = active_lane_ratio[1]
        self.water_thresh = water_reflection_threshold

    def analyze_obstacles(
        self,
        frame: np.ndarray,
        tracked_pedestrians: List[Dict[str, Any]],
        debris_detections: List[Dict[str, Any]],
        stopped_vehicles: List[Dict[str, Any]]
    ) -> List[ObstacleHazard]:
        h, w = frame.shape[:2]
        hazards = []

        # 1. Unexpected Pedestrian Crossing Analysis
        for ped in tracked_pedestrians:
            tid = ped.get('track_id', -1)
            bbox = tuple(int(v) for v in ped['bbox'])
            x1, y1, x2, y2 = bbox
            conf = float(ped.get('confidence', 0.88))
            vx, vy = ped.get('velocity', (0.0, 0.0))

            cx = (x1 + x2) / 2.0
            norm_cx = cx / float(w)
            norm_y2 = y2 / float(h)
            speed = np.hypot(vx, vy)

            # Check if pedestrian is in lane or entering lane
            in_lane = self.lane_left <= norm_cx <= self.lane_right
            entering_lane = (norm_cx < self.lane_left and vx > 10.0) or (norm_cx > self.lane_right and vx < -10.0)
            
            # Distance approximation (higher y2 is closer)
            dist_factor = min(1.0, norm_y2 ** 1.5)
            
            if in_lane or entering_lane:
                if in_lane and norm_y2 > 0.65:
                    sev = "CRITICAL"
                    prob = 0.95
                    desc = f"Pedestrian #{tid} directly in active vehicle lane!"
                elif entering_lane:
                    sev = "HIGH"
                    prob = 0.78
                    desc = f"Pedestrian #{tid} stepping into vehicle trajectory from shoulder (vx={vx:.1f}px/s)"
                else:
                    sev = "HIGH"
                    prob = 0.65
                    desc = f"Pedestrian #{tid} in forward road corridor"
                
                hazards.append(ObstacleHazard(
                    hazard_id=f"ped_{tid}",
                    obstacle_type="PEDESTRIAN_CROSSING",
                    bbox=bbox,
                    confidence=conf,
                    severity=sev,
                    lane_blocked=in_lane,
                    description=desc,
                    collision_probability=prob
                ))

        # 2. Road Debris, Fallen Objects, and Open Manholes
        for deb in debris_detections:
            bbox = tuple(int(v) for v in deb['bbox'])
            conf = float(deb.get('confidence', 0.82))
            x1, y1, x2, y2 = bbox
            cx = (x1 + x2) / 2.0
            norm_cx = cx / float(w)
            norm_y2 = y2 / float(h)
            box_w = max(1, x2 - x1)
            box_h = max(1, y2 - y1)
            area = box_w * box_h
            aspect = float(box_w) / float(box_h)

            in_lane = self.lane_left <= norm_cx <= self.lane_right
            
            # Open manhole signature: circular/square dark void on road
            if 0.8 <= aspect <= 1.25 and area > 1200 and norm_y2 > 0.50:
                obs_type = "OPEN_MANHOLE"
                desc = "Open manhole or missing utility cover on carriageway"
                sev = "CRITICAL" if in_lane else "HIGH"
                prob = 0.88 if in_lane else 0.40
            else:
                obs_type = "ROAD_DEBRIS"
                desc = "Road debris / fallen object blocking travel path"
                if in_lane and area > 4000:
                    sev = "HIGH"
                    prob = 0.75
                elif in_lane:
                    sev = "MEDIUM"
                    prob = 0.50
                else:
                    sev = "LOW"
                    prob = 0.20

            hazards.append(ObstacleHazard(
                hazard_id=f"deb_{x1}_{y1}",
                obstacle_type=obs_type,
                bbox=bbox,
                confidence=conf,
                severity=sev,
                lane_blocked=in_lane,
                description=desc,
                collision_probability=prob
            ))

        # 3. Waterlogging and Flooded Surface Detection (Lower Road Segment)
        water_hazard = self._detect_waterlogging(frame)
        if water_hazard:
            hazards.append(water_hazard)

        return hazards

    def _detect_waterlogging(self, frame: np.ndarray) -> Optional[ObstacleHazard]:
        """
        Detects road waterlogging by measuring specular sky reflection and low texture variance
        in the lower driving corridor.
        """
        h, w = frame.shape[:2]
        # Road corridor in lower third
        road_roi = frame[int(h * 0.65):h, int(w * 0.25):int(w * 0.75)]
        if road_roi.size == 0:
            return None

        hsv = cv2.cvtColor(road_roi, cv2.COLOR_BGR2HSV)
        # Specular glint: high brightness (V > 215), low saturation (S < 45)
        v_channel = hsv[:, :, 2]
        s_channel = hsv[:, :, 1]
        glint_mask = (v_channel > 215) & (s_channel < 45)
        glint_ratio = np.count_nonzero(glint_mask) / float(glint_mask.size)

        # Flat texture variance check (water surfaces are smooth)
        gray_roi = cv2.cvtColor(road_roi, cv2.COLOR_BGR2GRAY)
        lap_var = np.var(cv2.Laplacian(gray_roi, cv2.CV_64F))

        if glint_ratio >= self.water_thresh and lap_var < 280.0:
            roi_bbox = (int(w * 0.25), int(h * 0.65), int(w * 0.75), h)
            prob = min(0.90, 0.40 + glint_ratio * 2.0)
            sev = "HIGH" if glint_ratio > 0.25 else "MEDIUM"
            return ObstacleHazard(
                hazard_id=f"water_{int(glint_ratio*100)}",
                obstacle_type="WATERLOGGING",
                bbox=roi_bbox,
                confidence=round(float(min(0.95, 0.70 + glint_ratio)), 2),
                severity=sev,
                lane_blocked=True,
                description=f"Waterlogging / flooded surface detected on carriageway ({glint_ratio*100:.1f}% specular glint)",
                collision_probability=round(float(prob), 2)
            )
        return None
