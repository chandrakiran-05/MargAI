"""
FastAPI Backend Server for Road Safety AI
Provides REST endpoints and WebSocket streaming for edge/mobile clients.
Includes real-time smartphone dashcam frame ingestion and prototype synchronization.
"""

import os
import sys
import time
import base64
import json
import urllib.request
import cv2
import numpy as np
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
parent_dir = ROOT_DIR.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

from road_safety_ai.inference.pipeline import RoadSafetyPipeline
from road_safety_ai.alerts.alert_manager import AlertManager

app = FastAPI(
    title="Road Safety AI API",
    description="Production-grade real-time road hazard detection, tracking, and risk assessment backend",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global pipeline instance
weights_path = ROOT_DIR / "models" / "best.pt"
pipeline = RoadSafetyPipeline(
    model_path=str(weights_path) if weights_path.exists() else "yolo11n.pt",
    conf_threshold=0.35
)
alert_mgr = AlertManager()

# In-memory latest smartphone state
latest_smartphone_state = {
    "connected": False,
    "last_frame_timestamp": 0.0,
    "fps": 0.0,
    "latest_frame_b64": None,
    "latest_annotated_b64": None,
    "hazards": [],
    "telemetry": {},
    "device_info": {}
}

# Active WebSocket subscribers for zero-latency push
active_telemetry_websockets: List[WebSocket] = []

async def broadcast_telemetry(payload: dict, sender: WebSocket = None):
    """Pushes telemetry/frames to all connected infotainment screens instantly without polling."""
    dead = []
    for ws in list(active_telemetry_websockets):
        if ws == sender:
            continue
        try:
            await ws.send_json(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in active_telemetry_websockets:
            active_telemetry_websockets.remove(ws)

class SmartphoneFramePayload(BaseModel):
    image_base64: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude: Optional[float] = None
    z_accel_g: Optional[float] = 1.02
    speed_kmh: Optional[float] = 50.0
    device_id: Optional[str] = "smartphone_dashcam_01"
    corridor_id: Optional[str] = "blr_outer_ring_road"

@app.get("/api/status")
def get_system_status():
    import torch
    return {
        "status": "ONLINE",
        "system": "Road Safety AI",
        "device": "mps" if torch.backends.mps.is_available() else "cpu",
        "model_loaded": str(pipeline.model.ckpt_path if hasattr(pipeline.model, 'ckpt_path') else 'yolo11n'),
        "fps": round(pipeline.fps_rolling, 1),
        "latency_ms": round(pipeline.latency_rolling, 1),
        "smartphone_streaming": latest_smartphone_state["connected"]
    }

@app.get("/api/alerts")
def get_recent_alerts(limit: int = 50, category: Optional[str] = None, severity: Optional[str] = None):
    return alert_mgr.get_event_history(category=category, severity=severity, limit=limit)

@app.get("/api/smartphone/status")
def get_smartphone_status():
    now = time.time()
    is_active = (now - latest_smartphone_state["last_frame_timestamp"]) < 12.0
    latest_smartphone_state["connected"] = is_active
    return {
        "connected": is_active,
        "fps": latest_smartphone_state["fps"],
        "last_seen_sec_ago": round(now - latest_smartphone_state["last_frame_timestamp"], 1) if latest_smartphone_state["last_frame_timestamp"] > 0 else None,
        "active_hazards_count": len(latest_smartphone_state["hazards"]),
        "latest_hazards": latest_smartphone_state["hazards"],
        "telemetry": latest_smartphone_state["telemetry"],
        "device_info": latest_smartphone_state["device_info"]
    }

@app.get("/api/smartphone/latest_frame")
def get_latest_smartphone_frame():
    return {
        "connected": latest_smartphone_state["connected"],
        "frame_base64": latest_smartphone_state["latest_annotated_b64"],
        "raw_frame_base64": latest_smartphone_state["latest_frame_b64"],
        "hazards": latest_smartphone_state["hazards"],
        "telemetry": latest_smartphone_state["telemetry"]
    }

@app.post("/api/smartphone/frame")
async def process_smartphone_frame(payload: SmartphoneFramePayload):
    """
    Sub-second ingestion of smartphone dashcam frames.
    Runs deep learning perception, updates vehicle pose, fuses accelerometer telemetry,
    and relays any hazard instantly to the MargAI prototype command center.
    """
    t0 = time.time()

    # 1. Clean base64 header if present
    raw_b64 = payload.image_base64
    if "," in raw_b64:
        raw_b64 = raw_b64.split(",", 1)[1]

    try:
        img_bytes = base64.b64decode(raw_b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except Exception as e:
        return {"error": f"Failed to decode image: {str(e)}"}

    if frame is None:
        return {"error": "Invalid image payload"}

    # 2. Update GPS if smartphone provided real coordinates
    if payload.latitude and payload.longitude:
        pipeline.gps_tracker.lat = payload.latitude
        pipeline.gps_tracker.lng = payload.longitude
        pipeline.gps_tracker.has_hardware_lock = True
        if payload.speed_kmh is not None:
            pipeline.gps_tracker.speed_kmh = payload.speed_kmh

    # 3. Process frame through full AI pipeline (YOLO + ByteTrack + Risk Engine + HUD)
    annotated, hazards, telemetry = pipeline.process_frame(frame)

    # 4. Accelerometer & Sensor Fusion (Z-axis G-force spike detection)
    z_g = payload.z_accel_g or 1.02
    if z_g > 1.8:
        # Physical impact detected by smartphone accelerometer
        has_pothole = False
        for hz in hazards:
            if "POTHOLE" in hz['hazard_type']:
                hz['risk_level'] = "CRITICAL"
                hz['explanation'] = f"Pothole confirmed by smartphone Z-axis accelerometer impact spike ({z_g:.2f}G)!"
                has_pothole = True
        if not has_pothole:
            hazards.append({
                "hazard_type": "POTHOLE",
                "bbox": [100, 120, 220, 160],
                "confidence": 0.96,
                "risk_level": "CRITICAL",
                "distance_m": 15.0,
                "explanation": f"Pothole detected via high-G accelerometer road shockwave ({z_g:.2f}G)!"
            })

    # 5. Encode annotated HUD image back to JPEG base64
    _, buffer = cv2.imencode('.jpg', annotated, [cv2.IMWRITE_JPEG_QUALITY, 75])
    annotated_b64 = base64.b64encode(buffer).decode('utf-8')

    # 6. Update in-memory smartphone state for Prototype Dashboard mirroring
    dt = max(0.001, t0 - latest_smartphone_state["last_frame_timestamp"])
    current_fps = round(1.0 / dt, 1) if dt < 2.0 else 10.0
    
    latest_smartphone_state["connected"] = True
    latest_smartphone_state["last_frame_timestamp"] = t0
    latest_smartphone_state["fps"] = current_fps
    latest_smartphone_state["latest_frame_b64"] = payload.image_base64
    latest_smartphone_state["latest_annotated_b64"] = f"data:image/jpeg;base64,{annotated_b64}"
    latest_smartphone_state["hazards"] = hazards
    latest_smartphone_state["telemetry"] = {
        **telemetry,
        "z_accel_g": z_g,
        "speed_kmh": payload.speed_kmh
    }
    latest_smartphone_state["device_info"] = {
        "device_id": payload.device_id,
        "corridor_id": payload.corridor_id
    }

    # 7. Zero-latency relay to MargAI Prototype Server (port 8080)
    # If a critical or high hazard was detected, ingest as observation immediately!
    for hz in hazards:
        if hz['risk_level'] in ("HIGH", "CRITICAL"):
            try:
                obs_payload = {
                    "id": f"obs_phone_{int(t0*1000)%1000000}",
                    "hazardType": "pothole" if "POTHOLE" in hz['hazard_type'] else ("animal" if "ANIMAL" in hz['hazard_type'] else "debris"),
                    "severity": hz['risk_level'].lower(),
                    "confidence": hz['confidence'],
                    "corridorId": payload.corridor_id or "blr_outer_ring_road",
                    "latitude": payload.latitude or pipeline.gps_tracker.lat,
                    "longitude": payload.longitude or pipeline.gps_tracker.lng,
                    "observedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "sensorTelemetry": {
                        "zAccelerationG": z_g,
                        "opticalRoughness": 0.85
                    }
                }
                req = urllib.request.Request(
                    "http://localhost:8080/v1/observations",
                    data=json.dumps(obs_payload).encode('utf-8'),
                    headers={"Content-Type": "application/json"}
                )
                urllib.request.urlopen(req, timeout=0.15)
            except Exception:
                pass  # Non-blocking async relay

    roundtrip_ms = round((time.time() - t0) * 1000.0, 1)

    # 8. Instant Zero-Latency Push to connected Infotainment WebSockets
    import asyncio
    asyncio.create_task(broadcast_telemetry({
        "type": "telemetry_update",
        "connected": True,
        "fps": current_fps,
        "telemetry": latest_smartphone_state["telemetry"],
        "latest_hazards": hazards,
        "frame_base64": payload.image_base64
    }))

    return {
        "status": "success",
        "hazards": hazards,
        "telemetry": telemetry,
        "annotated_image": None,
        "roundtrip_latency_ms": roundtrip_ms,
        "fps": current_fps
    }

@app.websocket("/api/ws/telemetry")
async def websocket_telemetry_hub(websocket: WebSocket):
    await websocket.accept()
    active_telemetry_websockets.append(websocket)
    try:
        # Immediate initial state sync
        await websocket.send_json({
            "type": "sync",
            "connected": latest_smartphone_state["connected"],
            "fps": latest_smartphone_state["fps"],
            "telemetry": latest_smartphone_state["telemetry"],
            "latest_hazards": latest_smartphone_state["hazards"],
            "frame_base64": latest_smartphone_state["latest_frame_b64"]
        })
        while True:
            text = await websocket.receive_text()
            try:
                data = json.loads(text)
                now = time.time()
                latest_smartphone_state["connected"] = True
                latest_smartphone_state["last_frame_timestamp"] = now

                # Telemetry sync (supports both flat and nested telemetry object)
                if "telemetry" not in latest_smartphone_state or not isinstance(latest_smartphone_state["telemetry"], dict):
                    latest_smartphone_state["telemetry"] = {"speed_kmh": 0, "z_accel_g": 1.0, "road_geometry": {"curve_type": "STRAIGHT"}}

                tel_in = data.get("telemetry") if isinstance(data.get("telemetry"), dict) else data
                if "speed_kmh" in tel_in and tel_in["speed_kmh"] is not None:
                    latest_smartphone_state["telemetry"]["speed_kmh"] = tel_in["speed_kmh"]
                if "z_accel_g" in tel_in and tel_in["z_accel_g"] is not None:
                    latest_smartphone_state["telemetry"]["z_accel_g"] = tel_in["z_accel_g"]
                if "road_curve" in tel_in and tel_in["road_curve"] is not None:
                    if "road_geometry" not in latest_smartphone_state["telemetry"]:
                        latest_smartphone_state["telemetry"]["road_geometry"] = {}
                    latest_smartphone_state["telemetry"]["road_geometry"]["curve_type"] = tel_in["road_curve"]
                elif "road_geometry" in tel_in and isinstance(tel_in["road_geometry"], dict):
                    latest_smartphone_state["telemetry"]["road_geometry"] = tel_in["road_geometry"]

                # Hazards sync (Potholes, Pedestrians, Waterlogging, Curves, Cattle)
                incoming_hazards = data.get("latest_hazards") or data.get("hazards")
                if incoming_hazards is not None:
                    latest_smartphone_state["hazards"] = incoming_hazards

                if "frame_base64" in data and data["frame_base64"]:
                    latest_smartphone_state["latest_frame_b64"] = data["frame_base64"]
                elif "camera_b64" in data and data["camera_b64"]:
                    latest_smartphone_state["latest_frame_b64"] = data["camera_b64"]

                await broadcast_telemetry({
                    "type": "telemetry_update",
                    "connected": True,
                    "fps": latest_smartphone_state["fps"],
                    "telemetry": latest_smartphone_state["telemetry"],
                    "latest_hazards": latest_smartphone_state["hazards"],
                    "frame_base64": latest_smartphone_state["latest_frame_b64"]
                }, sender=websocket)
            except Exception:
                pass
    except WebSocketDisconnect:
        if websocket in active_telemetry_websockets:
            active_telemetry_websockets.remove(websocket)

@app.post("/api/detect/frame")
async def detect_frame(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        return {"error": "Invalid image payload"}

    annotated, hazards, telemetry = pipeline.process_frame(frame)

    _, buffer = cv2.imencode('.jpg', annotated)
    b64_img = base64.b64encode(buffer).decode('utf-8')

    return {
        "hazards": hazards,
        "telemetry": telemetry,
        "annotated_image_base64": b64_img
    }

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_bytes()
            nparr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is None:
                continue
            annotated, hazards, telemetry = pipeline.process_frame(frame)
            await websocket.send_json({
                "hazards": hazards,
                "telemetry": telemetry
            })
    except WebSocketDisconnect:
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
