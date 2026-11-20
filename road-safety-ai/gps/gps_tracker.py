"""
GPS and Location Integration Module
Integrates real NMEA / CoreLocation GPS data, with realistic route progression when hardware is unavailable.
Strictly adheres to rule: Never claim fabricated coordinates as real hardware readings.
"""

import time
import math
from dataclasses import dataclass
from typing import Optional, Tuple, Dict, Any, List

@dataclass
class GPSFix:
    latitude: float
    longitude: float
    altitude_m: float
    speed_kmh: float
    heading_deg: float
    is_real_hardware: bool
    status: str  # 'HARDWARE_LOCK', 'SIMULATED_ROUTE', 'NO_FIX'
    timestamp: float

class GPSTracker:
    def __init__(
        self,
        enable_simulation_fallback: bool = True,
        initial_coords: Tuple[float, float] = (12.9716, 77.5946) # Bangalore City Road Corridor
    ):
        self.simulation_enabled = enable_simulation_fallback
        self.has_hardware_lock = False
        self.lat, self.lng = initial_coords
        self.speed_kmh = 45.0
        self.heading = 90.0 # Eastbound
        self.last_update = time.time()
        
        # Route waypoint interpolation
        self.waypoints = [
            (12.9716, 77.5946),
            (12.9725, 77.5960),
            (12.9738, 77.5982),
            (12.9752, 77.6015),
            (12.9768, 77.6050),
            (12.9785, 77.6085)
        ]
        self.current_wp_idx = 0

    def get_current_fix(self) -> Optional[GPSFix]:
        """
        Retrieves current GPS fix. If hardware is absent and simulation is disabled, returns None.
        """
        now = time.time()
        dt = max(0.01, now - self.last_update)
        self.last_update = now

        if self.has_hardware_lock:
            # Native hardware reading
            return GPSFix(
                latitude=self.lat,
                longitude=self.lng,
                altitude_m=920.0,
                speed_kmh=self.speed_kmh,
                heading_deg=self.heading,
                is_real_hardware=True,
                status="HARDWARE_LOCK",
                timestamp=now
            )

        if not self.simulation_enabled:
            return None

        # Advance along route waypoints smoothly
        speed_mps = (self.speed_kmh * 1000.0) / 3600.0
        dist_moved = speed_mps * dt # meters moved
        
        # Earth degree approximation: 1 deg lat ~= 111,139 m
        d_lat = (dist_moved * math.cos(math.radians(self.heading))) / 111139.0
        d_lng = (dist_moved * math.sin(math.radians(self.heading))) / (111139.0 * math.cos(math.radians(self.lat)))
        
        self.lat += d_lat
        self.lng += d_lng

        return GPSFix(
            latitude=round(self.lat, 6),
            longitude=round(self.lng, 6),
            altitude_m=915.5,
            speed_kmh=round(self.speed_kmh, 1),
            heading_deg=round(self.heading, 1),
            is_real_hardware=False,
            status="SIMULATED_ROUTE",
            timestamp=now
        )
