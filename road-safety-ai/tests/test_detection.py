"""
Unit and Integration Tests for Specialized Detection Modules
"""

import unittest
import numpy as np
from road_safety_ai.detection.pothole_detector import PotholeDetector
from road_safety_ai.detection.animal_detector import AnimalDetector
from road_safety_ai.detection.accident_detector import AccidentDetector
from road_safety_ai.detection.obstacle_detector import ObstacleDetector

class TestDetectionModules(unittest.TestCase):
    def setUp(self):
        self.frame = np.zeros((480, 640, 3), dtype=np.uint8)
        # Create road texture
        self.frame[240:, :] = 80

    def test_pothole_analysis(self):
        detector = PotholeDetector()
        raw_dets = [
            {'bbox': [200, 350, 320, 420], 'confidence': 0.92},
            {'bbox': [220, 360, 310, 410], 'confidence': 0.88}
        ]
        hazards = detector.analyze_potholes(self.frame, raw_dets)
        self.assertEqual(len(hazards), 2)
        self.assertIn(hazards[0].size_category, ["SMALL", "MEDIUM", "LARGE"])
        self.assertTrue(0.0 <= hazards[0].severity_score <= 1.0)
        # Verify clustering detection
        self.assertTrue(hazards[0].is_clustered)
        self.assertEqual(hazards[0].cluster_count, 2)

    def test_animal_collision_trajectory(self):
        detector = AnimalDetector()
        tracked = [
            {
                'track_id': 101,
                'bbox': [280, 320, 360, 420],
                'confidence': 0.94,
                'velocity': (0.0, 15.0), # approaching
                'history': [(320, 300), (320, 370)],
                'area_history': [5000, 8000]
            }
        ]
        hazards = detector.analyze_animals((480, 640), tracked)
        self.assertEqual(len(hazards), 1)
        self.assertEqual(hazards[0].lane_position, "IN_LANE")
        self.assertIn(hazards[0].collision_risk, ["HIGH", "CRITICAL"])
        self.assertTrue(hazards[0].collision_probability > 0.40)

    def test_accident_temporal_stoppage(self):
        detector = AccidentDetector(stoppage_frames_thresh=5)
        tracked_veh = [{
            'track_id': 201,
            'bbox': [250, 280, 380, 400],
            'velocity': (0.0, 0.0)
        }]
        events = []
        for f in range(6):
            events = detector.process_frame_accidents(f, (480, 640), tracked_veh, [])
        # By frame 5, dangerous stoppage event should trigger
        self.assertTrue(any(e.event_type == "DANGEROUS_STOPPAGE" for e in events))

    def test_obstacle_unexpected_pedestrian(self):
        detector = ObstacleDetector()
        ped = [{
            'track_id': 301,
            'bbox': [290, 300, 340, 440],
            'confidence': 0.90,
            'velocity': (12.0, 0.0) # stepping into lane
        }]
        hazards = detector.analyze_obstacles(self.frame, ped, [], [])
        self.assertTrue(any(h.obstacle_type == "PEDESTRIAN_CROSSING" for h in hazards))

if __name__ == "__main__":
    unittest.main()
