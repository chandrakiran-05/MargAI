"""
Road Accident and Crash Detection Module
Combines visual wreck recognition with temporal video sequence analysis:
- Overturned vehicles (cars/motorcycles on side or roof)
- Multi-vehicle collisions (intersecting trajectories with abrupt deceleration)
- Stationary vehicles stopped in dangerous driving corridors
- Accident-related debris and lane blockage
"""

import numpy as np
from dataclasses import dataclass
from typing import List, Dict, Any, Tuple, Optional
from collections import deque

@dataclass
class AccidentEvent:
    accident_id: str
    event_type: str  # 'OVERTURNED_VEHICLE', 'COLLISION_IMPACT', 'DANGEROUS_STOPPAGE', 'WRECK_OBSTRUCTION'
    primary_bbox: Tuple[int, int, int, int]
    involved_tracks: List[int]
    confidence: float
    severity: str  # 'HIGH', 'CRITICAL'
    road_lane_blocked: bool
    evidence_description: str
    persistence_frames: int

class AccidentDetector:
    def __init__(
        self,
        deceleration_impact_thresh: float = 40.0,  # sudden speed drop indicating crash
        stoppage_frames_thresh: int = 30,  # 1-1.5 seconds stationary in lane
        active_lane_bounds: Tuple[float, float] = (0.25, 0.75)
    ):
        self.decel_thresh = deceleration_impact_thresh
        self.stoppage_thresh = stoppage_frames_thresh
        self.lane_left = active_lane_bounds[0]
        self.lane_right = active_lane_bounds[1]
        
        # Track historical velocities and positions: track_id -> deque of (frame_idx, cx, cy, speed)
        self.track_motion_history: Dict[int, deque] = {}
        # Stationary counter: track_id -> frames stationary
        self.stationary_counters: Dict[int, int] = {}
        # Active confirmed accidents: accident_id -> AccidentEvent
        self.active_accidents: Dict[str, AccidentEvent] = {}

    def process_frame_accidents(
        self,
        frame_idx: int,
        frame_shape: Tuple[int, int],
        tracked_vehicles: List[Dict[str, Any]],
        yolo_accident_detections: List[Dict[str, Any]]
    ) -> List[AccidentEvent]:
        """
        Analyzes current frame detections and multi-frame temporal movement.
        tracked_vehicles: list of vehicle tracks with track_id, bbox, velocity
        yolo_accident_detections: list of direct accident class detections from YOLO
        """
        h, w = frame_shape[:2]
        events = []

        # 1. Direct Visual Detection of Overturned / Damaged Vehicles
        for det in yolo_accident_detections:
            bbox = tuple(int(v) for v in det['bbox'])
            conf = float(det.get('confidence', 0.88))
            x1, y1, x2, y2 = bbox
            norm_cx = (x1 + x2) / (2.0 * w)
            is_in_lane = self.lane_left <= norm_cx <= self.lane_right
            
            event_id = f"acc_vis_{x1}_{y1}"
            event = AccidentEvent(
                accident_id=event_id,
                event_type="OVERTURNED_VEHICLE",
                primary_bbox=bbox,
                involved_tracks=[],
                confidence=conf,
                severity="CRITICAL",
                road_lane_blocked=is_in_lane,
                evidence_description="Visible wrecked/overturned vehicle recognized by detector",
                persistence_frames=1
            )
            events.append(event)

        # 2. Update Temporal Motion History for Each Vehicle Track
        current_track_ids = set()
        for veh in tracked_vehicles:
            tid = veh.get('track_id', -1)
            if tid < 0:
                continue
            current_track_ids.add(tid)
            bbox = tuple(int(v) for v in veh['bbox'])
            x1, y1, x2, y2 = bbox
            cx, cy = (x1 + x2) / 2.0, (y1 + y2) / 2.0
            vx, vy = veh.get('velocity', (0.0, 0.0))
            speed = np.hypot(vx, vy)

            if tid not in self.track_motion_history:
                self.track_motion_history[tid] = deque(maxlen=40)
            self.track_motion_history[tid].append((frame_idx, cx, cy, speed, bbox))

            # Stationary in active lane analysis
            norm_cx = cx / float(w)
            norm_y2 = y2 / float(h)
            if self.lane_left <= norm_cx <= self.lane_right and norm_y2 > 0.40 and speed < 4.0:
                self.stationary_counters[tid] = self.stationary_counters.get(tid, 0) + 1
            else:
                self.stationary_counters[tid] = max(0, self.stationary_counters.get(tid, 0) - 2)

            # Check if vehicle has been stopped in dangerous position
            if self.stationary_counters.get(tid, 0) >= self.stoppage_thresh:
                stoppage_event = AccidentEvent(
                    accident_id=f"stop_{tid}",
                    event_type="DANGEROUS_STOPPAGE",
                    primary_bbox=bbox,
                    involved_tracks=[tid],
                    confidence=0.92,
                    severity="HIGH",
                    road_lane_blocked=True,
                    evidence_description=f"Vehicle #{tid} completely stopped in active driving lane for >{self.stoppage_thresh} frames",
                    persistence_frames=self.stationary_counters[tid]
                )
                events.append(stoppage_event)

        # 3. Multi-Vehicle Collision Analysis (Temporal Intersection + Deceleration Spike)
        # Check pairs of vehicles
        veh_list = list(tracked_vehicles)
        num_v = len(veh_list)
        for i in range(num_v):
            for j in range(i + 1, num_v):
                v1, v2 = veh_list[i], veh_list[j]
                t1, t2 = v1.get('track_id', -1), v2.get('track_id', -2)
                
                b1 = v1['bbox']
                b2 = v2['bbox']
                
                # Check bounding box IoU overlap
                iou = self._compute_iou(b1, b2)
                if iou > 0.15:
                    # Check if at least one had significant speed prior to overlap that suddenly dropped
                    hist1 = self.track_motion_history.get(t1, [])
                    hist2 = self.track_motion_history.get(t2, [])
                    
                    decel_flag = False
                    if len(hist1) >= 5:
                        prior_speed = max(h[3] for h in list(hist1)[:-3])
                        curr_speed = hist1[-1][3]
                        if prior_speed - curr_speed > self.decel_thresh:
                            decel_flag = True
                    if len(hist2) >= 5:
                        prior_speed = max(h[3] for h in list(hist2)[:-3])
                        curr_speed = hist2[-1][3]
                        if prior_speed - curr_speed > self.decel_thresh:
                            decel_flag = True

                    if decel_flag or iou > 0.45:
                        # Collision impact confirmed!
                        comb_bbox = (
                            min(int(b1[0]), int(b2[0])),
                            min(int(b1[1]), int(b2[1])),
                            max(int(b1[2]), int(b2[2])),
                            max(int(b1[3]), int(b2[3]))
                        )
                        col_event = AccidentEvent(
                            accident_id=f"col_{min(t1, t2)}_{max(t1, t2)}",
                            event_type="COLLISION_IMPACT",
                            primary_bbox=comb_bbox,
                            involved_tracks=[t1, t2],
                            confidence=0.96,
                            severity="CRITICAL",
                            road_lane_blocked=True,
                            evidence_description=f"Vehicles #{t1} and #{t2} collided with abrupt deceleration (IoU={iou:.2f})",
                            persistence_frames=10
                        )
                        events.append(col_event)

        # Cleanup lost tracks
        for tid in list(self.track_motion_history.keys()):
            if tid not in current_track_ids:
                if frame_idx - self.track_motion_history[tid][-1][0] > 60:
                    del self.track_motion_history[tid]
                    self.stationary_counters.pop(tid, None)

        return events

    def _compute_iou(self, boxA: Tuple[float, ...], boxB: Tuple[float, ...]) -> float:
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])

        interArea = max(0.0, xB - xA) * max(0.0, yB - yA)
        boxAArea = max(1.0, (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]))
        boxBArea = max(1.0, (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]))

        iou = interArea / float(boxAArea + boxBArea - interArea)
        return float(iou)
