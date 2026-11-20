"""
Unit Tests for Alert Management, Deduplication, and Event Persistence
"""

import os
import unittest
import tempfile
from road_safety_ai.alerts.alert_manager import AlertManager

class TestAlertManager(unittest.TestCase):
    def setUp(self):
        self.tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.mgr = AlertManager(db_path=self.tmp_db.name, cooldown_seconds=2.0)

    def tearDown(self):
        if os.path.exists(self.tmp_db.name):
            os.remove(self.tmp_db.name)

    def test_alert_deduplication(self):
        # 1. First alert for track #5: Should be triggered
        a1 = self.mgr.process_hazard_alert(
            hazard_type="ANIMAL",
            risk_level="MEDIUM",
            confidence=0.91,
            collision_probability=0.35,
            distance_meters=25.0,
            ttc_seconds=None,
            gps_coords=(12.9716, 77.5946),
            recommended_action="Slow down",
            track_id=5
        )
        self.assertIsNotNone(a1)

        # 2. Immediate second alert for same track #5 with same risk: MUST BE SUPPRESSED (Deduplication)
        a2 = self.mgr.process_hazard_alert(
            hazard_type="ANIMAL",
            risk_level="MEDIUM",
            confidence=0.92,
            collision_probability=0.35,
            distance_meters=24.0,
            ttc_seconds=None,
            gps_coords=(12.9716, 77.5946),
            recommended_action="Slow down",
            track_id=5
        )
        self.assertIsNone(a2)

        # 3. Third alert with RISK ESCALATION (MEDIUM -> CRITICAL): MUST BE TRIGGERED!
        a3 = self.mgr.process_hazard_alert(
            hazard_type="ANIMAL",
            risk_level="CRITICAL",
            confidence=0.95,
            collision_probability=0.88,
            distance_meters=12.0,
            ttc_seconds=1.2,
            gps_coords=(12.9716, 77.5946),
            recommended_action="Emergency braking advisory",
            track_id=5
        )
        self.assertIsNotNone(a3)
        self.assertEqual(a3.risk_level, "CRITICAL")

    def test_event_persistence(self):
        self.mgr.process_hazard_alert(
            hazard_type="POTHOLE",
            risk_level="HIGH",
            confidence=0.89,
            collision_probability=0.60,
            distance_meters=18.0,
            ttc_seconds=2.5,
            gps_coords=(12.9720, 77.5950),
            recommended_action="Avoid sudden steering",
            track_id=12
        )
        history = self.mgr.get_event_history(category="POTHOLE")
        self.assertGreaterEqual(len(history), 1)
        self.assertEqual(history[0]['hazard_type'], "POTHOLE")

if __name__ == "__main__":
    unittest.main()
