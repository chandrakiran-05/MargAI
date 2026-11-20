"""
Visualization and HUD Overlay Utilities for Road Safety AI
Draws automotive-grade HUD overlays:
- Corner-bracketed bounding boxes color-coded by risk level
- Object track IDs, velocity vectors, and trajectory trails
- Lane curvature polynomial overlay (semi-transparent polygon)
- Telemetry telemetry bar (FPS, latency, GPS, Risk status)
- Audio-visual alert banners for CRITICAL hazards
"""

import cv2
import numpy as np
from typing import List, Dict, Any, Tuple, Optional

# Color palette: BGR format
COLOR_CRITICAL = (53, 67, 234)   # Google Red (#EA4335)
COLOR_HIGH = (5, 188, 251)       # Google Yellow (#FBBC05)
COLOR_MEDIUM = (244, 133, 66)    # Google Blue (#4285F4)
COLOR_LOW = (83, 168, 52)        # Google Green (#34A853)
COLOR_HUD_BG = (22, 13, 9)       # Deep obsidian (#090D16)
COLOR_LANE_CYAN = (235, 206, 135)# Glowing Cyan lane guide

RISK_COLORS = {
    "CRITICAL": COLOR_CRITICAL,
    "HIGH": COLOR_HIGH,
    "MEDIUM": COLOR_MEDIUM,
    "LOW": COLOR_LOW
}

def draw_corner_brackets(
    img: np.ndarray,
    bbox: Tuple[int, int, int, int],
    color: Tuple[int, int, int],
    length: int = 15,
    thickness: int = 2
):
    """Draws sleek automotive HUD corner brackets on a bounding box."""
    x1, y1, x2, y2 = bbox
    # Top-left
    cv2.line(img, (x1, y1), (x1 + length, y1), color, thickness)
    cv2.line(img, (x1, y1), (x1, y1 + length), color, thickness)
    # Top-right
    cv2.line(img, (x2, y1), (x2 - length, y1), color, thickness)
    cv2.line(img, (x2, y1), (x2, y1 + length), color, thickness)
    # Bottom-left
    cv2.line(img, (x1, y2), (x1 + length, y2), color, thickness)
    cv2.line(img, (x1, y2), (x1, y2 - length), color, thickness)
    # Bottom-right
    cv2.line(img, (x2, y2), (x2 - length, y2), color, thickness)
    cv2.line(img, (x2, y2), (x2, y2 - length), color, thickness)

def render_hud_frame(
    frame: np.ndarray,
    hazards: List[Dict[str, Any]],
    curve_data: Optional[Any],
    fps: float,
    latency_ms: float,
    gps_fix: Optional[Any] = None,
    critical_alert_text: Optional[str] = None
) -> np.ndarray:
    """
    Renders complete real-time HUD onto frame.
    """
    out = frame.copy()
    h, w = out.shape[:2]

    # 1. Draw Lane Curvature Overlay Polygon (if available)
    if curve_data and getattr(curve_data, 'curve_overlay_poly', None) is not None:
        poly = curve_data.curve_overlay_poly
        if len(poly) > 0:
            overlay = out.copy()
            curve_risk = getattr(curve_data, 'risk_level', 'LOW')
            lane_color = RISK_COLORS.get(curve_risk, COLOR_LANE_CYAN)
            cv2.fillPoly(overlay, [poly], lane_color)
            cv2.addWeighted(overlay, 0.22, out, 0.78, 0, out)

    # 2. Draw Detected Hazards and Tracked Objects
    for hz in hazards:
        bbox = hz['bbox']
        risk = hz.get('risk_level', 'LOW')
        color = RISK_COLORS.get(risk, COLOR_MEDIUM)
        
        # Bounding box & Corner brackets
        cv2.rectangle(out, (bbox[0], bbox[1]), (bbox[2], bbox[3]), color, 1)
        draw_corner_brackets(out, bbox, color, length=14, thickness=2)

        # Label tag
        hz_type = hz.get('hazard_type', 'HAZARD')
        conf = int(hz.get('confidence', 0.8) * 100)
        track_id = hz.get('track_id', None)
        tid_str = f"#{track_id} " if track_id is not None and track_id >= 0 else ""
        label = f"{tid_str}{hz_type} [{risk} {conf}%]"

        # Text banner
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.45
        (tw, th), _ = cv2.getTextSize(label, font, font_scale, 1)
        tag_y1 = max(0, bbox[1] - th - 6)
        tag_y2 = bbox[1]
        
        cv2.rectangle(out, (bbox[0], tag_y1), (bbox[0] + tw + 6, tag_y2), COLOR_HUD_BG, -1)
        cv2.rectangle(out, (bbox[0], tag_y1), (bbox[0] + tw + 6, tag_y2), color, 1)
        cv2.putText(out, label, (bbox[0] + 3, tag_y2 - 3), font, font_scale, (255, 255, 255), 1, cv2.LINE_AA)

        # Draw trajectory history line
        history = hz.get('history', [])
        if len(history) >= 2:
            pts = np.array(history, dtype=np.int32).reshape((-1, 1, 2))
            cv2.polylines(out, [pts], False, color, 1, cv2.LINE_AA)

        # Velocity vector arrow
        vx, vy = hz.get('velocity', (0.0, 0.0))
        if abs(vx) > 3.0 or abs(vy) > 3.0:
            cx = (bbox[0] + bbox[2]) // 2
            cy = (bbox[1] + bbox[3]) // 2
            cv2.arrowedLine(out, (cx, cy), (int(cx + vx * 0.8), int(cy + vy * 0.8)), color, 2, tipLength=0.3)

    # 3. Top Telemetry Bar
    cv2.rectangle(out, (0, 0), (w, 42), COLOR_HUD_BG, -1)
    cv2.line(out, (0, 42), (w, 42), (40, 50, 70), 1)

    font = cv2.FONT_HERSHEY_SIMPLEX
    # System Status & Performance
    fps_text = f"FPS: {fps:.1f} ({latency_ms:.1f}ms)"
    cv2.putText(out, fps_text, (16, 26), font, 0.55, (0, 255, 180), 1, cv2.LINE_AA)

    # Road Curvature Telemetry
    if curve_data:
        c_type = getattr(curve_data, 'curve_type', 'STRAIGHT')
        r_m = getattr(curve_data, 'radius_meters', 2000.0)
        safe_spd = getattr(curve_data, 'recommended_safe_speed_kmh', 80)
        curve_txt = f"ROAD: {c_type} (R={int(r_m)}m | Max {safe_spd} km/h)"
        cv2.putText(out, curve_txt, (220, 26), font, 0.50, (200, 220, 255), 1, cv2.LINE_AA)

    # GPS Telemetry
    if gps_fix:
        gps_txt = f"GPS: {gps_fix.latitude:.4f}, {gps_fix.longitude:.4f} ({gps_fix.speed_kmh:.0f} km/h)"
    else:
        gps_txt = "GPS: ACQUIRING..."
    cv2.putText(out, gps_txt, (w - 330, 26), font, 0.50, (180, 190, 210), 1, cv2.LINE_AA)

    # 4. Critical Warning Banner at Bottom
    if critical_alert_text:
        banner_h = 44
        cv2.rectangle(out, (0, h - banner_h), (w, h), COLOR_CRITICAL, -1)
        alert_msg = f"CRITICAL ALERT: {critical_alert_text.upper()}"
        (atw, ath), _ = cv2.getTextSize(alert_msg, font, 0.60, 2)
        tx = max(20, (w - atw) // 2)
        cv2.putText(out, alert_msg, (tx, h - 14), font, 0.60, (255, 255, 255), 2, cv2.LINE_AA)

    return out
