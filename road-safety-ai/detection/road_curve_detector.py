"""
Geometric Road Curvature and Dangerous Curve Detection Module
Uses computer vision and geometric analysis (NOT object detection):
- Inverse Perspective Mapping (Bird's-Eye View)
- 2nd-degree polynomial road boundary curvature fitting: x = ay^2 + by + c
- Real-world Radius of Curvature (R) calculation in meters
- Classification: STRAIGHT, GENTLE_CURVE, SHARP_LEFT, SHARP_RIGHT, HAIRPIN_BEND
- Blind curve and insufficient visibility horizon estimation
"""

import cv2
import numpy as np
from dataclasses import dataclass
from typing import Dict, Any, Tuple, Optional, List

@dataclass
class RoadCurveAnalysis:
    curve_type: str  # 'STRAIGHT', 'GENTLE_LEFT', 'GENTLE_RIGHT', 'SHARP_LEFT', 'SHARP_RIGHT', 'HAIRPIN_BEND'
    radius_meters: float  # Radius of curvature in meters
    curvature_rate: float  # |2a| polynomial coefficient
    is_blind_curve: bool  # Insufficient forward sight distance
    visibility_horizon_meters: float  # Estimated forward visibility before road is occluded
    recommended_safe_speed_kmh: int
    risk_level: str  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    lane_deviation_px: float  # Horizontal offset from lane center
    curve_overlay_poly: Optional[np.ndarray] = None  # Polygon for visual HUD rendering

class RoadCurveDetector:
    def __init__(
        self,
        ym_per_pix: float = 30.0 / 720.0,   # meters per pixel in y dimension
        xm_per_pix: float = 3.7 / 700.0,    # meters per pixel in x dimension (standard lane ~3.7m)
        sharp_radius_threshold_m: float = 280.0,
        hairpin_radius_threshold_m: float = 120.0
    ):
        self.ym_per_pix = ym_per_pix
        self.xm_per_pix = xm_per_pix
        self.sharp_thresh = sharp_radius_threshold_m
        self.hairpin_thresh = hairpin_radius_threshold_m
        
        # Exponential moving average for temporal stability across frames
        self.prev_radius = 2000.0
        self.prev_type = "STRAIGHT"

    def analyze_road_geometry(self, frame: np.ndarray) -> RoadCurveAnalysis:
        """
        Analyzes road boundaries and curvature from camera frame using geometric analysis.
        """
        h, w = frame.shape[:2]
        
        # 1. Perspective Transform: Source (trapezoid in front of vehicle) to Destination (bird's-eye)
        src = np.float32([
            [w * 0.12, h],           # Bottom-left
            [w * 0.42, h * 0.62],    # Top-left
            [w * 0.58, h * 0.62],    # Top-right
            [w * 0.88, h]            # Bottom-right
        ])
        dst = np.float32([
            [w * 0.25, h],
            [w * 0.25, 0],
            [w * 0.75, 0],
            [w * 0.75, h]
        ])
        
        M = cv2.getPerspectiveTransform(src, dst)
        Minv = cv2.getPerspectiveTransform(dst, src)
        warped = cv2.warpPerspective(frame, M, (w, h), flags=cv2.INTER_LINEAR)

        # 2. Extract Road Markings and Edge Features in Bird's-Eye View
        hsv = cv2.cvtColor(warped, cv2.COLOR_BGR2HSV)
        # White lane filter
        lower_white = np.array([0, 0, 180], dtype=np.uint8)
        upper_white = np.array([180, 40, 255], dtype=np.uint8)
        white_mask = cv2.inRange(hsv, lower_white, upper_white)
        
        # Yellow lane filter
        lower_yellow = np.array([15, 80, 100], dtype=np.uint8)
        upper_yellow = np.array([35, 255, 255], dtype=np.uint8)
        yellow_mask = cv2.inRange(hsv, lower_yellow, upper_yellow)
        
        combined_binary = cv2.bitwise_or(white_mask, yellow_mask)
        
        # Edge gradient filter
        gray_warped = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
        sobelx = cv2.Sobel(gray_warped, cv2.CV_64F, 1, 0, ksize=3)
        abs_sobel64f = np.absolute(sobelx)
        sobel_norm = np.uint8(255 * abs_sobel64f / (np.max(abs_sobel64f) + 1e-5))
        _, edge_binary = cv2.threshold(sobel_norm, 40, 255, cv2.THRESH_BINARY)
        
        road_binary = cv2.bitwise_or(combined_binary, edge_binary)

        # 3. Sliding Window Polynomial Fit
        nonzero = road_binary.nonzero()
        nonzeroy = np.array(nonzero[0])
        nonzerox = np.array(nonzero[1])

        # If too few edge pixels detected, fallback to center lane projection
        if len(nonzerox) < 150:
            return self._fallback_analysis(h, w)

        # Histogram of bottom half to find lane baselines
        bottom_half = road_binary[h // 2:, :]
        histogram = np.sum(bottom_half, axis=0)
        midpoint = int(w // 2)
        
        left_base = np.argmax(histogram[:midpoint])
        right_base = np.argmax(histogram[midpoint:]) + midpoint
        
        # Ensure sane baselines
        if left_base < w * 0.05: left_base = int(w * 0.25)
        if right_base > w * 0.95 or right_base <= left_base: right_base = int(w * 0.75)

        # Sliding window parameters
        nwindows = 9
        window_height = int(h // nwindows)
        margin = int(w * 0.08)
        minpix = 40

        left_lane_inds = []
        right_lane_inds = []
        
        current_left = left_base
        current_right = right_base

        for window in range(nwindows):
            win_y_low = h - (window + 1) * window_height
            win_y_high = h - window * window_height
            win_xleft_low = current_left - margin
            win_xleft_high = current_left + margin
            win_xright_low = current_right - margin
            win_xright_high = current_right + margin

            good_left_inds = ((nonzeroy >= win_y_low) & (nonzeroy < win_y_high) &
                              (nonzerox >= win_xleft_low) & (nonzerox < win_xleft_high)).nonzero()[0]
            good_right_inds = ((nonzeroy >= win_y_low) & (nonzeroy < win_y_high) &
                               (nonzerox >= win_xright_low) & (nonzerox < win_xright_high)).nonzero()[0]

            left_lane_inds.append(good_left_inds)
            right_lane_inds.append(good_right_inds)

            if len(good_left_inds) > minpix:
                current_left = int(np.mean(nonzerox[good_left_inds]))
            if len(good_right_inds) > minpix:
                current_right = int(np.mean(nonzerox[good_right_inds]))

        left_lane_inds = np.concatenate(left_lane_inds) if left_lane_inds else np.array([])
        right_lane_inds = np.concatenate(right_lane_inds) if right_lane_inds else np.array([])

        # Fit 2nd degree polynomial: x = ay^2 + by + c
        if len(left_lane_inds) > 100:
            left_fit = np.polyfit(nonzeroy[left_lane_inds], nonzerox[left_lane_inds], 2)
        else:
            left_fit = np.array([0.0, 0.0, float(w * 0.25)])

        if len(right_lane_inds) > 100:
            right_fit = np.polyfit(nonzeroy[right_lane_inds], nonzerox[right_lane_inds], 2)
        else:
            right_fit = np.array([0.0, 0.0, float(w * 0.75)])

        # Average lane curvature: a_avg, b_avg
        a_avg = (left_fit[0] + right_fit[0]) / 2.0
        b_avg = (left_fit[1] + right_fit[1]) / 2.0

        # 4. Compute Radius of Curvature in Real-World Meters
        # R = ((1 + (2a y_eval ym + b)^2)^(3/2)) / |2a ym / (xm^2)|
        y_eval = float(h)
        a_scaled = a_avg * (self.xm_per_pix / (self.ym_per_pix ** 2))
        b_scaled = b_avg * (self.xm_per_pix / self.ym_per_pix)

        if abs(a_scaled) > 1e-7:
            radius = ((1 + (2 * a_scaled * (y_eval * self.ym_per_pix) + b_scaled) ** 2) ** 1.5) / abs(2 * a_scaled)
        else:
            radius = 3500.0

        # Temporal smoothing
        radius = 0.75 * self.prev_radius + 0.25 * min(4000.0, radius)
        self.prev_radius = radius
        radius_m = round(float(radius), 1)

        # 5. Curve Classification
        # Direction determined by curvature coefficient a_avg:
        # a_avg < -0.0001 curves RIGHT, a_avg > 0.0001 curves LEFT
        if radius_m < self.hairpin_thresh:
            c_type = "HAIRPIN_BEND"
            safe_speed = 25
            risk = "CRITICAL"
        elif radius_m < self.sharp_thresh:
            if a_avg > 0:
                c_type = "SHARP_LEFT"
            else:
                c_type = "SHARP_RIGHT"
            safe_speed = 40
            risk = "HIGH"
        elif radius_m < 800.0:
            c_type = "GENTLE_LEFT" if a_avg > 0 else "GENTLE_RIGHT"
            safe_speed = 65
            risk = "MEDIUM"
        else:
            c_type = "STRAIGHT"
            safe_speed = 90
            risk = "LOW"

        # 6. Blind Curve & Sight Distance Estimation
        # Check forward visibility: where the lane terminates in the upper field of view
        top_y = min(np.min(nonzeroy[left_lane_inds]) if len(left_lane_inds) > 0 else h * 0.6,
                    np.min(nonzeroy[right_lane_inds]) if len(right_lane_inds) > 0 else h * 0.6)
        sight_distance_m = round(float(max(15.0, (h - top_y) * self.ym_per_pix)), 1)
        
        is_blind = (c_type in ("SHARP_LEFT", "SHARP_RIGHT", "HAIRPIN_BEND")) and (sight_distance_m < 45.0)
        if is_blind:
            risk = "CRITICAL"
            safe_speed = min(safe_speed, 30)

        # Lane center offset
        car_center = w / 2.0
        lane_center = (left_base + right_base) / 2.0
        lane_deviation_m = (car_center - lane_center) * self.xm_per_pix

        # Generate Curve Overlay Polygon (for HUD display)
        ploty = np.linspace(h * 0.55, h - 1, int(h * 0.45))
        left_fitx = left_fit[0] * ploty**2 + left_fit[1] * ploty + left_fit[2]
        right_fitx = right_fit[0] * ploty**2 + right_fit[1] * ploty + right_fit[2]

        pts_left = np.array([np.transpose(np.vstack([left_fitx, ploty]))])
        pts_right = np.array([np.flipud(np.transpose(np.vstack([right_fitx, ploty])))])
        pts = np.hstack((pts_left, pts_right))
        
        # Unwarp polygon back to original camera perspective
        curve_poly = cv2.perspectiveTransform(pts.astype(np.float32), Minv).astype(np.int32)

        return RoadCurveAnalysis(
            curve_type=c_type,
            radius_meters=radius_m,
            curvature_rate=round(float(abs(2 * a_avg)), 6),
            is_blind_curve=is_blind,
            visibility_horizon_meters=sight_distance_m,
            recommended_safe_speed_kmh=safe_speed,
            risk_level=risk,
            lane_deviation_px=round(float(lane_deviation_m), 2),
            curve_overlay_poly=curve_poly
        )

    def _fallback_analysis(self, h: int, w: int) -> RoadCurveAnalysis:
        return RoadCurveAnalysis(
            curve_type="STRAIGHT",
            radius_meters=2500.0,
            curvature_rate=0.0,
            is_blind_curve=False,
            visibility_horizon_meters=80.0,
            recommended_safe_speed_kmh=80,
            risk_level="LOW",
            lane_deviation_px=0.0,
            curve_overlay_poly=None
        )
