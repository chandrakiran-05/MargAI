"""
Real-Time Multi-Object Tracking Engine (ByteTrack / SORT)
Features:
- Kalman Filter state estimation: [x_center, y_center, aspect_ratio, height, dx, dy, da, dh]
- Two-stage association: high-confidence detections first, then low-confidence detections
- Persistent Track IDs across frame occlusions
- Trajectory velocity and heading vector computation
- Bounding box expansion rate computation (for approaching / collision risk)
"""

import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from collections import deque

class KalmanBoxTracker:
    count = 0

    def __init__(self, bbox: Tuple[float, float, float, float], score: float, class_id: int):
        """
        Initializes a tracker using initial bounding box [x1, y1, x2, y2].
        State vector: [x, y, s, r, x_vel, y_vel, s_vel, r_vel]^T
        x, y: center coords
        s: scale/area (w * h)
        r: aspect ratio (w / h)
        """
        self.id = KalmanBoxTracker.count
        KalmanBoxTracker.count += 1
        
        self.score = score
        self.class_id = class_id
        
        # State vector: [cx, cy, s, r, vx, vy, vs, vr]
        w = max(1.0, bbox[2] - bbox[0])
        h = max(1.0, bbox[3] - bbox[1])
        cx = bbox[0] + w / 2.0
        cy = bbox[1] + h / 2.0
        s = w * h
        r = w / float(h)
        
        self.state = np.array([cx, cy, s, r, 0.0, 0.0, 0.0, 0.0], dtype=np.float32)
        
        # Covariance matrix P
        self.P = np.diag([10.0, 10.0, 100.0, 1.0, 1000.0, 1000.0, 1000.0, 10.0])
        # Process noise Q
        self.Q = np.diag([1.0, 1.0, 10.0, 0.01, 10.0, 10.0, 100.0, 0.1])
        # Measurement matrix H
        self.H = np.zeros((4, 8), dtype=np.float32)
        self.H[0, 0] = 1.0
        self.H[1, 1] = 1.0
        self.H[2, 2] = 1.0
        self.H[3, 3] = 1.0
        # Measurement noise R
        self.R = np.diag([1.0, 1.0, 10.0, 0.1])
        
        # State transition matrix F
        self.F = np.eye(8, dtype=np.float32)
        self.F[0, 4] = 1.0
        self.F[1, 5] = 1.0
        self.F[2, 6] = 1.0
        self.F[3, 7] = 1.0
        
        self.time_since_update = 0
        self.hits = 1
        self.hit_streak = 1
        self.age = 0
        
        self.history = deque(maxlen=30)
        self.area_history = deque(maxlen=15)
        self.history.append((cx, cy))
        self.area_history.append(s)

    def predict(self) -> np.ndarray:
        """Advances state vector and returns predicted bounding box."""
        self.state = np.dot(self.F, self.state)
        self.P = np.dot(np.dot(self.F, self.P), self.F.T) + self.Q
        self.age += 1
        if self.time_since_update > 0:
            self.hit_streak = 0
        self.time_since_update += 1
        return self.get_bbox()

    def update(self, bbox: Tuple[float, float, float, float], score: float):
        """Updates state with observed bounding box."""
        self.time_since_update = 0
        self.hits += 1
        self.hit_streak += 1
        self.score = score
        
        w = max(1.0, bbox[2] - bbox[0])
        h = max(1.0, bbox[3] - bbox[1])
        cx = bbox[0] + w / 2.0
        cy = bbox[1] + h / 2.0
        s = w * h
        r = w / float(h)
        
        z = np.array([cx, cy, s, r], dtype=np.float32)
        
        # Kalman update equations
        y = z - np.dot(self.H, self.state)
        S = np.dot(np.dot(self.H, self.P), self.H.T) + self.R
        K = np.dot(np.dot(self.P, self.H.T), np.linalg.inv(S))
        
        self.state = self.state + np.dot(K, y)
        self.P = self.P - np.dot(np.dot(K, self.H), self.P)
        
        self.history.append((cx, cy))
        self.area_history.append(s)

    def get_bbox(self) -> Tuple[float, float, float, float]:
        """Converts current state [cx, cy, s, r] back to [x1, y1, x2, y2]."""
        cx, cy, s, r = self.state[0], self.state[1], self.state[2], self.state[3]
        s = max(1.0, s)
        r = max(0.05, r)
        w = np.sqrt(s * r)
        h = s / float(w)
        return (cx - w / 2.0, cy - h / 2.0, cx + w / 2.0, cy + h / 2.0)

    def get_velocity(self) -> Tuple[float, float]:
        """Returns velocity vector (vx, vy) in pixels per frame."""
        return (float(self.state[4]), float(self.state[5]))


class ByteTracker:
    def __init__(
        self,
        max_lost_frames: int = 25,
        min_hits: int = 2,
        high_thresh: float = 0.50,
        low_thresh: float = 0.20,
        iou_threshold: float = 0.25
    ):
        self.max_lost = max_lost_frames
        self.min_hits = min_hits
        self.high_thresh = high_thresh
        self.low_thresh = low_thresh
        self.iou_thresh = iou_threshold
        self.trackers: List[KalmanBoxTracker] = []
        self.frame_count = 0

    def update(self, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        detections: list of dicts: {'bbox': [x1, y1, x2, y2], 'confidence': float, 'class_id': int}
        Returns list of active tracked objects:
        {
            'track_id': int,
            'bbox': [x1, y1, x2, y2],
            'confidence': float,
            'class_id': int,
            'velocity': (vx, vy),
            'history': [(cx, cy), ...],
            'area_history': [s1, s2, ...]
        }
        """
        self.frame_count += 1

        # 1. Predict new locations of existing trackers
        for t in self.trackers:
            t.predict()

        # 2. Split detections into high and low confidence pools
        high_dets = []
        low_dets = []
        for d in detections:
            conf = d.get('confidence', 0.5)
            if conf >= self.high_thresh:
                high_dets.append(d)
            elif conf >= self.low_thresh:
                low_dets.append(d)

        # 3. Stage 1: Associate high confidence detections with active trackers
        matched_tracks, unmatched_dets, unmatched_tracks = self._associate(
            self.trackers, high_dets, self.iou_thresh
        )

        for t_idx, d_idx in matched_tracks:
            self.trackers[t_idx].update(high_dets[d_idx]['bbox'], high_dets[d_idx]['confidence'])

        # 4. Stage 2: Associate remaining trackers with low confidence detections
        remaining_trackers = [self.trackers[i] for i in unmatched_tracks]
        matched_stage2, unmatched_dets_s2, unmatched_tracks_s2 = self._associate(
            remaining_trackers, low_dets, self.iou_thresh * 0.8
        )

        for t_idx, d_idx in matched_stage2:
            remaining_trackers[t_idx].update(low_dets[d_idx]['bbox'], low_dets[d_idx]['confidence'])

        # 5. Initialize new trackers for unmatched high confidence detections
        for d_idx in unmatched_dets:
            det = high_dets[d_idx]
            new_tracker = KalmanBoxTracker(det['bbox'], det['confidence'], det.get('class_id', 0))
            self.trackers.append(new_tracker)

        # 6. Remove dead trackers
        alive_trackers = []
        for t in self.trackers:
            if t.time_since_update <= self.max_lost:
                alive_trackers.append(t)
        self.trackers = alive_trackers

        # 7. Collect confirmed output tracks
        results = []
        for t in self.trackers:
            if (t.hits >= self.min_hits or self.frame_count <= self.min_hits) and t.time_since_update <= 1:
                b = t.get_bbox()
                results.append({
                    'track_id': t.id,
                    'bbox': [int(b[0]), int(b[1]), int(b[2]), int(b[3])],
                    'confidence': round(float(t.score), 2),
                    'class_id': t.class_id,
                    'velocity': t.get_velocity(),
                    'history': list(t.history),
                    'area_history': list(t.area_history)
                })

        return results

    def _associate(
        self,
        trackers: List[KalmanBoxTracker],
        detections: List[Dict[str, Any]],
        thresh: float
    ) -> Tuple[List[Tuple[int, int]], List[int], List[int]]:
        if len(trackers) == 0:
            return [], list(range(len(detections))), []
        if len(detections) == 0:
            return [], [], list(range(len(trackers)))

        iou_matrix = np.zeros((len(trackers), len(detections)), dtype=np.float32)
        for t_idx, t in enumerate(trackers):
            t_box = t.get_bbox()
            for d_idx, d in enumerate(detections):
                iou_matrix[t_idx, d_idx] = self._calc_iou(t_box, d['bbox'])

        # Greedy match by highest IoU
        matched_indices = []
        unmatched_trackers = set(range(len(trackers)))
        unmatched_detections = set(range(len(detections)))

        while True:
            if len(unmatched_trackers) == 0 or len(unmatched_detections) == 0:
                break
            
            # Find max IoU
            sub_matrix = iou_matrix[list(unmatched_trackers), :][:, list(unmatched_detections)]
            max_val = np.max(sub_matrix)
            if max_val < thresh:
                break

            max_loc = np.unravel_index(np.argmax(sub_matrix), sub_matrix.shape)
            real_t = list(unmatched_trackers)[max_loc[0]]
            real_d = list(unmatched_detections)[max_loc[1]]

            matched_indices.append((real_t, real_d))
            unmatched_trackers.remove(real_t)
            unmatched_detections.remove(real_d)

        return matched_indices, list(unmatched_detections), list(unmatched_trackers)

    @staticmethod
    def _calc_iou(boxA: Tuple[float, float, float, float], boxB: Tuple[float, float, float, float]) -> float:
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])

        interArea = max(0.0, xB - xA) * max(0.0, yB - yA)
        boxAArea = max(1.0, (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]))
        boxBArea = max(1.0, (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]))

        return float(interArea / (boxAArea + boxBArea - interArea))
