"""
FastAPI Backend Server for Road Safety AI
Provides REST endpoints and WebSocket streaming for edge/mobile clients.
"""

import os
import sys
import time
import base64
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

@app.get("/api/status")
def get_system_status():
    import torch
    return {
        "status": "ONLINE",
        "system": "Road Safety AI",
        "device": "mps" if torch.backends.mps.is_available() else "cpu",
        "model_loaded": str(pipeline.model.ckpt_path if hasattr(pipeline.model, 'ckpt_path') else 'yolo11n'),
        "fps": round(pipeline.fps_rolling, 1),
        "latency_ms": round(pipeline.latency_rolling, 1)
    }

@app.get("/api/alerts")
def get_recent_alerts(limit: int = 50, category: Optional[str] = None, severity: Optional[str] = None):
    return alert_mgr.get_event_history(category=category, severity=severity, limit=limit)

@app.post("/api/detect/frame")
async def detect_frame(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        return {"error": "Invalid image payload"}

    annotated, hazards, telemetry = pipeline.process_frame(frame)

    # Encode annotated frame as JPEG base64
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
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
