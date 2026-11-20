#!/usr/bin/env python3
"""
MargAI Perception Microservice
Google Startup Buildathon India 2026

FastAPI microservice serving the trained road hazard detection model.
Integrates with the Node.js API relay and Android edge dashcam client.
"""

import os
import sys
import json
import time
import base64
import cv2
import numpy as np
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

# Load infer module
from infer import load_model, predict_frame

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"

app = FastAPI(
    title="MargAI Perception Edge Service",
    description="Sub-100ms Road Hazard Detection API (Pothole, Animal, Pedestrian)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instance
model = None


@app.on_event("startup")
def startup_event():
    global model
    try:
        model = load_model()
        print("✓ MargAI model loaded into memory.")
    except Exception as e:
        print(f"⚠ Model load warning: {e}")


@app.get("/health")
def health():
    metrics_file = MODELS_DIR / "training_metrics.json"
    metrics = {}
    if metrics_file.exists():
        with open(metrics_file) as f:
            metrics = json.load(f)

    return {
        "status": "ok" if model is not None else "degraded",
        "service": "MargAI Edge Perception Engine",
        "modelLoaded": model is not None,
        "classes": ["pothole", "animal", "pedestrian"],
        "metrics": metrics.get("metrics", {}),
    }


class Base64ImageRequest(BaseModel):
    imageBase64: str
    confidenceThreshold: Optional[float] = 0.35


@app.post("/predict")
async def predict_base64(req: Base64ImageRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Perception model is initializing")

    try:
        # Decode base64
        data = req.imageBase64
        if "," in data:
            data = data.split(",")[1]
        img_bytes = base64.b64decode(data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image payload")

        detections, _, lat_ms = predict_frame(model, img, conf_threshold=req.confidenceThreshold)
        return {
            "status": "success",
            "inferenceTimeMs": lat_ms,
            "hazardCount": len(detections),
            "detections": detections,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict-file")
async def predict_file(file: UploadFile = File(...), conf: float = Form(0.35)):
    if model is None:
        raise HTTPException(status_code=503, detail="Perception model is initializing")

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Unable to decode image file")

    detections, _, lat_ms = predict_frame(model, img, conf_threshold=conf)
    return {
        "status": "success",
        "filename": file.filename,
        "inferenceTimeMs": lat_ms,
        "hazardCount": len(detections),
        "detections": detections,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8082)
