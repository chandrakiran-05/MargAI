"""
End-to-End Real-Time Road Safety Inference Pipeline
Coordinates:
Camera Input -> Preprocessing -> YOLO Inference -> Specialized Detectors ->
ByteTrack Tracking -> Risk Assessment -> Alert Deduplication & Dispatch -> HUD Rendering
"""

import os
import time
import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Generator
from ultralytics import YOLO

from road_safety_ai.tracking.byte_tracker import ByteTracker
from road_safety_ai.detection.pothole_detector import PotholeDetector
from road_safety_ai.detection.animal_detector import AnimalDetector
from road_safety_ai.detection.accident_detector import AccidentDetector
from road_safety_ai.detection.road_curve_detector import RoadCurveDetector
from road_safety_ai.detection.obstacle_detector import ObstacleDetector
from road_safety_ai.risk_engine.risk_assessor import RiskAssessmentEngine, RiskEvaluation
from road_safety_ai.alerts.alert_manager import AlertManager, RoadAlert
from road_safety_ai.alerts.sound_effects import SoundAlertManager
from road_safety_ai.gps.gps_tracker import GPSTracker
from road_safety_ai.utils.visualization import render_hud_frame

class RoadSafetyPipeline:
    CLASS_MAP = {
        0: "pothole",
        1: "animal",
        2: "pedestrian",
        3: "vehicle",
        4: "accident",
        5: "debris"
    }

    def __init__(
        self,
        model_path: Optional[str] = None,
        conf_threshold: float = 0.35,
        enable_audio_alerts: bool = True,
        enable_gps_sim: bool = True
    ):
        base_dir = Path(__file__).resolve().parent.parent
        if model_path is None:
            # Check for best trained weights, else fallback
            trained_best = base_dir / "models" / "best.pt"
            if trained_best.exists():
                model_path = str(trained_best)
            else:
                model_path = "yolo11n.pt"

        print(f"[Pipeline] Initializing YOLO with weights: {model_path}")
        self.model = YOLO(model_path)
        self.conf_thresh = conf_threshold

        # Specialized sub-modules
        self.tracker = ByteTracker(max_lost_frames=20, min_hits=2, high_thresh=0.45, low_thresh=0.20)
        self.pothole_detector = PotholeDetector()
        self.animal_detector = AnimalDetector()
        self.accident_detector = AccidentDetector()
        self.curve_detector = RoadCurveDetector()
        self.obstacle_detector = ObstacleDetector()
        self.risk_engine = RiskAssessmentEngine()
        self.alert_manager = AlertManager()
        self.sound_manager = SoundAlertManager(enabled=enable_audio_alerts)
        self.gps_tracker = GPSTracker(enable_simulation_fallback=enable_gps_sim)

        self.frame_idx = 0
        self.fps_rolling = 30.0
        self.latency_rolling = 15.0

    def process_frame(
        self,
        frame: np.ndarray,
        analyze_curve: bool = True
    ) -> Tuple[np.ndarray, List[Dict[str, Any]], Dict[str, Any]]:
        """
        Processes a single BGR frame through the full AI pipeline.
        Returns:
        - annotated_frame: HUD rendered frame
        - frame_hazards: list of evaluated hazard dicts
        - telemetry: system telemetry dict (FPS, latency, GPS, curve stats)
        """
        t0 = time.time()
        self.frame_idx += 1
        h, w = frame.shape[:2]

        # 1. GPS Acquisition
        gps_fix = self.gps_tracker.get_current_fix()
        gps_coords = (gps_fix.latitude, gps_fix.longitude) if gps_fix else None

        # 2. Geometric Road Curvature Analysis (Geometric Computer Vision, NOT Object Detection)
        curve_data = self.curve_detector.analyze_road_geometry(frame) if analyze_curve else None

        # 3. YOLO Object Detection
        # Ultralytics inference
        yolo_results = self.model(frame, conf=self.conf_thresh, imgsz=320, verbose=False)[0]
        
        raw_detections = []
        pothole_raw = []
        accident_raw = []
        debris_raw = []

        if yolo_results.boxes is not None and len(yolo_results.boxes) > 0:
            for b in yolo_results.boxes:
                coords = b.xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = int(coords[0]), int(coords[1]), int(coords[2]), int(coords[3])
                conf = float(b.conf[0].cpu().numpy())
                cls_id = int(b.cls[0].cpu().numpy())
                
                det_dict = {
                    'bbox': [x1, y1, x2, y2],
                    'confidence': conf,
                    'class_id': cls_id,
                    'class_name': self.CLASS_MAP.get(cls_id, f"class_{cls_id}")
                }
                raw_detections.append(det_dict)

                if cls_id == 0:  # pothole
                    pothole_raw.append(det_dict)
                elif cls_id == 4:  # accident
                    accident_raw.append(det_dict)
                elif cls_id == 5:  # debris
                    debris_raw.append(det_dict)

        # 4. Multi-Object Tracking across consecutive frames (ByteTrack)
        # Track dynamic objects: animals (1), pedestrians (2), vehicles (3)
        dynamic_dets = [d for d in raw_detections if d['class_id'] in (1, 2, 3)]
        tracked_objects = self.tracker.update(dynamic_dets)

        tracked_animals = [t for t in tracked_objects if t['class_id'] == 1]
        tracked_pedestrians = [t for t in tracked_objects if t['class_id'] == 2]
        tracked_vehicles = [t for t in tracked_objects if t['class_id'] == 3]

        # 5. Specialized Domain Analysis
        pothole_hazards = self.pothole_detector.analyze_potholes(frame, pothole_raw)
        animal_hazards = self.animal_detector.analyze_animals((h, w), tracked_animals)
        accident_events = self.accident_detector.process_frame_accidents(
            self.frame_idx, (h, w), tracked_vehicles, accident_raw
        )
        obstacle_hazards = self.obstacle_detector.analyze_obstacles(
            frame, tracked_pedestrians, debris_raw, []
        )

        # 6. Unified Risk Assessment & Alert Generation
        evaluated_hazards = []
        critical_alerts = []

        # (a) Evaluate Potholes
        for p in pothole_hazards:
            risk_eval = self.risk_engine.evaluate_hazard(
                hazard_type="POTHOLE",
                bbox=p.bbox,
                confidence=p.confidence,
                frame_shape=(h, w),
                additional_metrics={
                    'severity_score': p.severity_score,
                    'is_clustered': p.is_clustered,
                    'cluster_count': p.cluster_count,
                    'size_category': p.size_category,
                    'depth_category': p.depth_category
                }
            )
            self._handle_evaluated_risk(risk_eval, p.bbox, evaluated_hazards, critical_alerts, gps_coords)

        # (b) Evaluate Animals
        for a in animal_hazards:
            risk_eval = self.risk_engine.evaluate_hazard(
                hazard_type="ANIMAL",
                bbox=a.bbox,
                confidence=a.confidence,
                frame_shape=(h, w),
                velocity_vector=a.velocity_vector,
                additional_metrics={
                    'species_guess': a.species_guess,
                    'behavior_state': a.behavior_state,
                    'lane_position': a.lane_position,
                    'track_id': a.track_id
                }
            )
            self._handle_evaluated_risk(risk_eval, a.bbox, evaluated_hazards, critical_alerts, gps_coords, track_id=a.track_id)

        # (c) Evaluate Accidents
        for acc in accident_events:
            risk_eval = self.risk_engine.evaluate_hazard(
                hazard_type="ACCIDENT",
                bbox=acc.primary_bbox,
                confidence=acc.confidence,
                frame_shape=(h, w),
                additional_metrics={
                    'event_type': acc.event_type,
                    'evidence_description': acc.evidence_description
                }
            )
            self._handle_evaluated_risk(risk_eval, acc.primary_bbox, evaluated_hazards, critical_alerts, gps_coords)

        # (d) Evaluate Pedestrians and Obstacles
        for obs in obstacle_hazards:
            risk_eval = self.risk_engine.evaluate_hazard(
                hazard_type=obs.obstacle_type,
                bbox=obs.bbox,
                confidence=obs.confidence,
                frame_shape=(h, w),
                additional_metrics={
                    'hazard_id': obs.hazard_id,
                    'description': obs.description
                }
            )
            self._handle_evaluated_risk(risk_eval, obs.bbox, evaluated_hazards, critical_alerts, gps_coords)

        # (e) Evaluate Dangerous Road Curvature
        if curve_data and curve_data.risk_level in ("HIGH", "CRITICAL"):
            curve_alert = self.alert_manager.process_hazard_alert(
                hazard_type="SHARP_CURVE",
                risk_level=curve_data.risk_level,
                confidence=0.95,
                collision_probability=0.80 if curve_data.is_blind_curve else 0.50,
                distance_meters=curve_data.visibility_horizon_meters,
                ttc_seconds=None,
                gps_coords=gps_coords,
                recommended_action=f"Reduce speed to <{curve_data.recommended_safe_speed_kmh} km/h for {curve_data.curve_type}",
                explanation=f"Curvature R={int(curve_data.radius_meters)}m, Blind={curve_data.is_blind_curve}"
            )
            if curve_alert:
                self.sound_manager.play_alert_sound(curve_alert.risk_level, "SHARP_CURVE")
                if curve_alert.risk_level == "CRITICAL":
                    critical_alerts.append(f"{curve_data.curve_type} (R={int(curve_data.radius_meters)}m)")

        # 7. Performance Benchmarking
        latency_ms = (time.time() - t0) * 1000.0
        fps = 1000.0 / max(1.0, latency_ms)
        self.fps_rolling = 0.90 * self.fps_rolling + 0.10 * fps
        self.latency_rolling = 0.90 * self.latency_rolling + 0.10 * latency_ms

        # 8. Render HUD Visualization
        crit_msg = critical_alerts[0] if critical_alerts else None
        annotated = render_hud_frame(
            frame=frame,
            hazards=evaluated_hazards,
            curve_data=curve_data,
            fps=self.fps_rolling,
            latency_ms=self.latency_rolling,
            gps_fix=gps_fix,
            critical_alert_text=crit_msg
        )

        telemetry = {
            "fps": round(self.fps_rolling, 1),
            "latency_ms": round(self.latency_rolling, 1),
            "total_hazards": len(evaluated_hazards),
            "gps": {
                "latitude": gps_fix.latitude if gps_fix else None,
                "longitude": gps_fix.longitude if gps_fix else None,
                "speed_kmh": gps_fix.speed_kmh if gps_fix else None,
                "is_real": gps_fix.is_real_hardware if gps_fix else False
            },
            "road_geometry": {
                "curve_type": curve_data.curve_type if curve_data else "UNKNOWN",
                "radius_meters": curve_data.radius_meters if curve_data else None,
                "risk_level": curve_data.risk_level if curve_data else "LOW"
            }
        }

        return annotated, evaluated_hazards, telemetry

    def _handle_evaluated_risk(
        self,
        risk_eval: RiskEvaluation,
        bbox: Tuple[int, int, int, int],
        out_hazards_list: List[Dict[str, Any]],
        critical_alerts_list: List[str],
        gps_coords: Optional[Tuple[float, float]],
        track_id: Optional[int] = None
    ):
        # Format for HUD
        out_hazards_list.append({
            'hazard_type': risk_eval.hazard_type,
            'bbox': list(bbox),
            'risk_level': risk_eval.risk_level,
            'confidence': risk_eval.detection_confidence,
            'track_id': track_id,
            'distance_m': risk_eval.estimated_distance_meters,
            'ttc_sec': risk_eval.time_to_collision_sec
        })

        # Process through AlertManager (deduplication + persistence)
        alert = self.alert_manager.process_hazard_alert(
            hazard_type=risk_eval.hazard_type,
            risk_level=risk_eval.risk_level,
            confidence=risk_eval.detection_confidence,
            collision_probability=risk_eval.collision_probability,
            distance_meters=risk_eval.estimated_distance_meters,
            ttc_seconds=risk_eval.time_to_collision_sec,
            gps_coords=gps_coords,
            recommended_action=risk_eval.recommended_action,
            track_id=track_id,
            explanation=risk_eval.explanation
        )

        if alert:
            # Sound alert trigger
            self.sound_manager.play_alert_sound(alert.risk_level, alert.hazard_type)
            if alert.risk_level == "CRITICAL":
                critical_alerts_list.append(f"{alert.hazard_type}: {alert.recommended_action}")
