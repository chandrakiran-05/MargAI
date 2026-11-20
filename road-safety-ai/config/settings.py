"""
Global Configuration and Hyperparameters for Road Safety AI
"""

from dataclasses import dataclass
from typing import Tuple

@dataclass
class SystemSettings:
    # Model settings
    MODEL_WEIGHTS: str = "road-safety-ai/models/best.pt"
    FALLBACK_WEIGHTS: str = "yolo11n.pt"
    IMAGE_SIZE: int = 320
    CONFIDENCE_THRESHOLD: float = 0.35
    IOU_THRESHOLD: float = 0.45

    # Tracker settings (ByteTrack)
    TRACKER_HIGH_THRESH: float = 0.45
    TRACKER_LOW_THRESH: float = 0.20
    TRACKER_MAX_LOST: int = 25
    TRACKER_MIN_HITS: int = 2

    # Risk Engine settings
    DEFAULT_VEHICLE_SPEED_KMH: float = 60.0
    CRITICAL_TTC_SECONDS: float = 2.0
    HIGH_TTC_SECONDS: float = 4.0
    EGO_CORRIDOR_RATIO: Tuple[float, float] = (0.28, 0.72)

    # Road Curvature thresholds
    SHARP_RADIUS_METERS: float = 280.0
    HAIRPIN_RADIUS_METERS: float = 120.0
    BLIND_HORIZON_METERS: float = 45.0

    # Alert settings
    ALERT_COOLDOWN_SECONDS: float = 4.0
    ENABLE_AUDIO_ALERTS: bool = True

settings = SystemSettings()
