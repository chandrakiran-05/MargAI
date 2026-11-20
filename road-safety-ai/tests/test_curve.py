"""
Unit Tests for Road Curve and Blind Turn Geometry Detection
"""

import unittest
import numpy as np
import cv2
from road_safety_ai.detection.road_curve_detector import RoadCurveDetector

class TestRoadCurveDetector(unittest.TestCase):
    def setUp(self):
        self.detector = RoadCurveDetector()
        # Synthetic road image
        self.frame = np.zeros((720, 1280, 3), dtype=np.uint8)
        # Draw road boundaries
        cv2.line(self.frame, (200, 720), (550, 440), (255, 255, 255), 8)
        cv2.line(self.frame, (1080, 720), (730, 440), (255, 255, 255), 8)

    def test_straight_road_detection(self):
        analysis = self.detector.analyze_road_geometry(self.frame)
        self.assertIn(analysis.curve_type, ["STRAIGHT", "GENTLE_LEFT", "GENTLE_RIGHT"])
        self.assertGreater(analysis.radius_meters, 300.0)
        self.assertFalse(analysis.is_blind_curve)

if __name__ == "__main__":
    unittest.main()
