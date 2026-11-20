"""
Intelligent Alert Management and Event Persistence System
Features:
- Smart Alert Deduplication: Prevents repeatedly spamming alerts for the same tracked object
- Escalation Handling: Immediately raises alert if risk level escalates (e.g., MEDIUM -> CRITICAL)
- SQLite Event Database for full audit trail, querying, and filtering
- Formats structured alerts with type, risk level, confidence, GPS, and recommended action
"""

import os
import time
import sqlite3
import datetime
from dataclasses import dataclass, asdict
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path

@dataclass
class RoadAlert:
    alert_id: str
    hazard_type: str
    risk_level: str  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    confidence: float
    collision_probability: float
    distance_meters: float
    ttc_seconds: Optional[float]
    gps_lat: Optional[float]
    gps_lng: Optional[float]
    timestamp: str
    recommended_action: str
    track_id: Optional[int]
    snapshot_path: Optional[str]
    explanation: str

    def format_display(self) -> str:
        loc_str = f"({self.gps_lat:.5f}, {self.gps_lng:.5f})" if self.gps_lat is not None else "Location: GPS acquiring..."
        ttc_str = f" | TTC: {self.ttc_seconds}s" if self.ttc_seconds is not None else ""
        return (
            f"HAZARD DETECTED: {self.hazard_type}\n"
            f"Risk Level: {self.risk_level}\n"
            f"Confidence: {int(self.confidence * 100)}% | Collision Prob: {int(self.collision_probability * 100)}%{ttc_str}\n"
            f"Location: {loc_str}\n"
            f"Timestamp: {self.timestamp}\n"
            f"Recommended Action: {self.recommended_action}"
        )

class AlertManager:
    RISK_SEVERITY_ORDER = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}

    def __init__(
        self,
        db_path: Optional[str] = None,
        cooldown_seconds: float = 4.0
    ):
        if db_path is None:
            base_dir = Path(__file__).resolve().parent.parent
            self.db_path = str(base_dir / "events.db")
        else:
            self.db_path = db_path
            
        self.cooldown_sec = cooldown_seconds
        
        # Deduplication cache: key -> (last_alert_time, last_risk_level)
        self.alert_history: Dict[str, Tuple[float, str]] = {}
        # Recent live alerts queue for UI/dashboard
        self.active_alerts: List[RoadAlert] = []
        
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS hazard_events (
                alert_id TEXT PRIMARY KEY,
                hazard_type TEXT,
                risk_level TEXT,
                confidence REAL,
                collision_probability REAL,
                distance_meters REAL,
                ttc_seconds REAL,
                gps_lat REAL,
                gps_lng REAL,
                timestamp TEXT,
                recommended_action TEXT,
                track_id INTEGER,
                snapshot_path TEXT,
                explanation TEXT
            )
        """)
        conn.commit()
        conn.close()

    def process_hazard_alert(
        self,
        hazard_type: str,
        risk_level: str,
        confidence: float,
        collision_probability: float,
        distance_meters: float,
        ttc_seconds: Optional[float],
        gps_coords: Optional[Tuple[float, float]],
        recommended_action: str,
        track_id: Optional[int] = None,
        explanation: str = "",
        snapshot_path: Optional[str] = None
    ) -> Optional[RoadAlert]:
        """
        Processes an incoming hazard. Returns RoadAlert if not deduplicated; returns None if suppressed.
        """
        # Formulate deduplication key
        if track_id is not None and track_id >= 0:
            dedup_key = f"{hazard_type}_track_{track_id}"
        else:
            # Fallback to coarse spatial segment
            lat_bucket = round(gps_coords[0], 4) if gps_coords else 0
            lng_bucket = round(gps_coords[1], 4) if gps_coords else 0
            dedup_key = f"{hazard_type}_{lat_bucket}_{lng_bucket}"

        now = time.time()
        should_alert = True

        if dedup_key in self.alert_history:
            last_time, last_risk = self.alert_history[dedup_key]
            time_elapsed = now - last_time
            
            # Check if risk escalated (e.g. MEDIUM -> CRITICAL)
            current_sev = self.RISK_SEVERITY_ORDER.get(risk_level, 1)
            last_sev = self.RISK_SEVERITY_ORDER.get(last_risk, 1)
            
            if current_sev > last_sev:
                should_alert = True  # Risk escalated: trigger immediate alert!
            elif time_elapsed < self.cooldown_sec:
                should_alert = False # Within cooldown: suppress repeat alert!

        if not should_alert:
            return None

        # Record in history
        self.alert_history[dedup_key] = (now, risk_level)

        alert_id = f"ALT-{int(now * 1000) % 1000000:06d}"
        iso_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        lat = gps_coords[0] if gps_coords else None
        lng = gps_coords[1] if gps_coords else None

        alert = RoadAlert(
            alert_id=alert_id,
            hazard_type=hazard_type,
            risk_level=risk_level,
            confidence=round(confidence, 2),
            collision_probability=round(collision_probability, 2),
            distance_meters=round(distance_meters, 1),
            ttc_seconds=ttc_seconds,
            gps_lat=lat,
            gps_lng=lng,
            timestamp=iso_time,
            recommended_action=recommended_action,
            track_id=track_id,
            snapshot_path=snapshot_path,
            explanation=explanation
        )

        # Store in DB
        self._save_to_db(alert)

        # Prepend to active queue (keep recent 50)
        self.active_alerts.insert(0, alert)
        if len(self.active_alerts) > 50:
            self.active_alerts.pop()

        return alert

    def _save_to_db(self, alert: RoadAlert):
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute("""
            INSERT OR REPLACE INTO hazard_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            alert.alert_id,
            alert.hazard_type,
            alert.risk_level,
            alert.confidence,
            alert.collision_probability,
            alert.distance_meters,
            alert.ttc_seconds,
            alert.gps_lat,
            alert.gps_lng,
            alert.timestamp,
            alert.recommended_action,
            alert.track_id,
            alert.snapshot_path,
            alert.explanation
        ))
        conn.commit()
        conn.close()

    def get_event_history(
        self,
        category: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        query = "SELECT * FROM hazard_events WHERE 1=1"
        params = []
        if category and category != "ALL":
            query += " AND hazard_type LIKE ?"
            params.append(f"%{category}%")
        if severity and severity != "ALL":
            query += " AND risk_level = ?"
            params.append(severity)
            
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        
        rows = cur.execute(query, params).fetchall()
        result = [dict(r) for r in rows]
        conn.close()
        return result
