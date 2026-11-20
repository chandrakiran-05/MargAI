"""
Unit Tests for Intelligent Risk Assessment Engine
"""

import unittest
from road_safety_ai.risk_engine.risk_assessor import RiskAssessmentEngine

class TestRiskEngine(unittest.TestCase):
    def setUp(self):
        self.engine = RiskAssessmentEngine()

    def test_risk_levels_and_confidence_separation(self):
        # 1. Distant small pothole on periphery: High detection confidence (95%), but LOW risk level!
        eval_low = self.engine.evaluate_hazard(
            hazard_type="POTHOLE",
            bbox=(50, 200, 80, 230),
            confidence=0.95,
            frame_shape=(720, 1280),
            additional_metrics={'severity_score': 0.1}
        )
        self.assertEqual(eval_low.detection_confidence, 0.95)
        self.assertEqual(eval_low.risk_level, "LOW")
        self.assertLess(eval_low.collision_probability, 0.35)

        # 2. Immediate obstacle directly in vehicle path: High risk & high collision probability!
        eval_crit = self.engine.evaluate_hazard(
            hazard_type="ACCIDENT",
            bbox=(500, 550, 780, 710), # directly in path at bumper level
            confidence=0.88,
            frame_shape=(720, 1280),
            velocity_vector=(0.0, 10.0),
            additional_metrics={'event_type': 'OVERTURNED_VEHICLE'}
        )
        self.assertEqual(eval_crit.risk_level, "CRITICAL")
        self.assertTrue(eval_crit.in_ego_path)
        self.assertIsNotNone(eval_crit.time_to_collision_sec)

if __name__ == "__main__":
    unittest.main()
