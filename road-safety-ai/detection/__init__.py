"""
Specialized Detection Modules for Road Safety AI
"""
from .pothole_detector import PotholeDetector, PotholeHazard
from .animal_detector import AnimalDetector, AnimalHazard
from .accident_detector import AccidentDetector, AccidentEvent
from .road_curve_detector import RoadCurveDetector, RoadCurveAnalysis
from .obstacle_detector import ObstacleDetector, ObstacleHazard

__all__ = [
    "PotholeDetector",
    "PotholeHazard",
    "AnimalDetector",
    "AnimalHazard",
    "AccidentDetector",
    "AccidentEvent",
    "RoadCurveDetector",
    "RoadCurveAnalysis",
    "ObstacleDetector",
    "ObstacleHazard",
]
