"""
Pothole Detection and Severity Assessment Module
Analyzes pothole detections from YOLO to:
- Estimate physical size (small, medium, large)
- Estimate depth and damage severity (0.0 to 1.0)
- Detect multiple potholes in the same road segment (clustering)
- Classify structural road surface degradation
"""

import cv2
import numpy as np
from dataclasses import dataclass
from typing import List, Dict, Any, Tuple

@dataclass
class PotholeHazard:
    bbox: Tuple[int, int, int, int]  # (x1, y1, x2, y2)
    confidence: float
    size_category: str  # 'SMALL', 'MEDIUM', 'LARGE'
    depth_category: str  # 'SHALLOW', 'MODERATE', 'DEEP'
    area_pixels: int
    severity_score: float  # 0.0 (minor) to 1.0 (severe wheel-damaging)
    aspect_ratio: float
    is_clustered: bool
    cluster_count: int

class PotholeDetector:
    def __init__(
        self,
        small_threshold_px: int = 1500,
        large_threshold_px: int = 8000,
        cluster_distance_px: int = 120
    ):
        self.small_threshold_px = small_threshold_px
        self.large_threshold_px = large_threshold_px
        self.cluster_distance_px = cluster_distance_px

    def analyze_potholes(
        self,
        frame: np.ndarray,
        pothole_detections: List[Dict[str, Any]]
    ) -> List[PotholeHazard]:
        """
        Analyzes a list of raw YOLO pothole detections on the frame.
        pothole_detections: list of dicts with keys 'bbox': [x1, y1, x2, y2], 'confidence': float
        """
        if not pothole_detections:
            return []

        h, w = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if len(frame.shape) == 3 else frame
        
        hazards = []
        centers = []

        for det in pothole_detections:
            x1, y1, x2, y2 = [int(v) for v in det['bbox']]
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)
            
            box_w = max(1, x2 - x1)
            box_h = max(1, y2 - y1)
            area = box_w * box_h
            aspect_ratio = float(box_w) / float(box_h)
            cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
            centers.append((cx, cy))

            # Crop region of interest for depth and roughness estimation
            roi = gray[y1:y2, x1:x2]
            
            # 1. Size Classification
            if area < self.small_threshold_px:
                size_cat = "SMALL"
            elif area < self.large_threshold_px:
                size_cat = "MEDIUM"
            else:
                size_cat = "LARGE"

            # 2. Depth Estimation (contrast, shadow darkness, gradient magnitude)
            depth_cat, depth_score = self._estimate_depth(roi)

            # 3. Comprehensive Severity Score (0.0 to 1.0)
            # Factors: relative size (40%), depth/shadow intensity (35%), road proximity (y2 in frame, 25%)
            proximity_factor = min(1.0, y2 / float(h))  # Higher y means closer to vehicle bumper
            size_factor = min(1.0, area / float(self.large_threshold_px * 1.5))
            severity = (0.40 * size_factor) + (0.35 * depth_score) + (0.25 * proximity_factor)
            severity = round(min(1.0, max(0.0, severity)), 3)

            hazard = PotholeHazard(
                bbox=(x1, y1, x2, y2),
                confidence=float(det.get('confidence', 0.85)),
                size_category=size_cat,
                depth_category=depth_cat,
                area_pixels=area,
                severity_score=severity,
                aspect_ratio=round(aspect_ratio, 2),
                is_clustered=False,
                cluster_count=1
            )
            hazards.append(hazard)

        # 4. Multi-Pothole Cluster Analysis
        hazards = self._compute_clusters(hazards, centers)
        return hazards

    def _estimate_depth(self, roi: np.ndarray) -> Tuple[str, float]:
        """
        Estimates cavity depth based on dark shadow cores and Laplacian edge intensity.
        Deep potholes feature sharp edge drop-offs and dark interior absorption.
        """
        if roi.size == 0 or roi.shape[0] < 4 or roi.shape[1] < 4:
            return "MODERATE", 0.5

        # Measure interior shadow (lower 20th percentile of brightness)
        p20 = np.percentile(roi, 20)
        mean_val = np.mean(roi)
        shadow_contrast = max(0.0, (mean_val - p20) / (mean_val + 1e-5))

        # Edge roughness using Laplacian
        laplacian = cv2.Laplacian(roi, cv2.CV_64F)
        edge_variance = np.var(laplacian)
        edge_norm = min(1.0, edge_variance / 800.0)

        depth_score = (0.6 * shadow_contrast) + (0.4 * edge_norm)
        depth_score = min(1.0, max(0.0, depth_score))

        if depth_score < 0.35:
            return "SHALLOW", depth_score
        elif depth_score < 0.70:
            return "MODERATE", depth_score
        else:
            return "DEEP", depth_score

    def _compute_clusters(
        self,
        hazards: List[PotholeHazard],
        centers: List[Tuple[int, int]]
    ) -> List[PotholeHazard]:
        """Flags when multiple potholes appear in the same segment (< cluster_distance)."""
        n = len(hazards)
        if n <= 1:
            return hazards

        for i in range(n):
            cluster_c = 1
            for j in range(n):
                if i != j:
                    dist = np.hypot(centers[i][0] - centers[j][0], centers[i][1] - centers[j][1])
                    if dist <= self.cluster_distance_px:
                        cluster_c += 1
            if cluster_c > 1:
                hazards[i].is_clustered = True
                hazards[i].cluster_count = cluster_c
                # Clustered potholes escalate severity by 15%
                hazards[i].severity_score = min(1.0, round(hazards[i].severity_score * 1.15, 3))
        return hazards
