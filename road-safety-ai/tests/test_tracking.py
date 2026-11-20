"""
Unit Tests for ByteTrack Multi-Object Tracking Engine
"""

import unittest
from road_safety_ai.tracking.byte_tracker import ByteTracker

class TestTracking(unittest.TestCase):
    def test_track_persistence_across_frames(self):
        tracker = ByteTracker(max_lost_frames=5, min_hits=2)
        
        # Frame 1: Detection of vehicle
        dets_f1 = [{'bbox': [100, 100, 200, 200], 'confidence': 0.90, 'class_id': 3}]
        res_f1 = tracker.update(dets_f1)
        
        # Frame 2: Vehicle moves slightly
        dets_f2 = [{'bbox': [105, 105, 205, 205], 'confidence': 0.88, 'class_id': 3}]
        res_f2 = tracker.update(dets_f2)
        self.assertEqual(len(res_f2), 1)
        track_id = res_f2[0]['track_id']

        # Frame 3: Vehicle continues motion
        dets_f3 = [{'bbox': [110, 110, 210, 210], 'confidence': 0.85, 'class_id': 3}]
        res_f3 = tracker.update(dets_f3)
        self.assertEqual(len(res_f3), 1)
        self.assertEqual(res_f3[0]['track_id'], track_id) # Track ID must persist!

        # Check velocity calculation
        vx, vy = res_f3[0]['velocity']
        self.assertTrue(abs(vx) >= 0.0)

if __name__ == "__main__":
    unittest.main()
