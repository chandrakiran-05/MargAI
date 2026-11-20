#!/usr/bin/env python3
"""
MargAI Hazard Perception Model Training Script
Google Startup Buildathon India 2026

Trains an edge-optimized YOLO11n object detector to detect:
  - Class 0: pothole
  - Class 1: animal
  - Class 2: pedestrian

Utilizes Apple Silicon MPS GPU acceleration, logs metrics,
and exports best weights for edge deployment.
"""

import os
import sys
import json
import shutil
import time
from pathlib import Path
import torch
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent
DATA_YAML = BASE_DIR / "data.yaml"
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)


def check_environment():
    print("=" * 65)
    print("🔍 MargAI ML Environment Diagnostic")
    print("=" * 65)
    print(f"PyTorch Version: {torch.__version__}")
    
    device = "cpu"
    if torch.backends.mps.is_available():
        device = "mps"
        print("✓ Metal Performance Shaders (MPS) Apple Silicon GPU detected")
    elif torch.cuda.is_available():
        device = "cuda"
        print(f"✓ NVIDIA CUDA detected: {torch.cuda.get_device_name(0)}")
    else:
        print("ℹ CPU execution fallback")
    
    print(f"Active Training Device: {device.upper()}")
    print(f"Dataset Specification: {DATA_YAML}")
    return device


def train_model(epochs=15, imgsz=320, batch=16, device="mps"):
    print("\n" + "=" * 65)
    print("🚀 Initializing YOLO11-Nano Edge Architecture")
    print("=" * 65)

    # Load pre-trained nano backbone
    model = YOLO("yolo11n.pt")
    start_time = time.time()

    print(f"Beginning training for {epochs} epochs at {imgsz}x{imgsz} resolution...")
    results = model.train(
        data=str(DATA_YAML),
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        device=device,
        project=str(BASE_DIR / "runs" / "train"),
        name="margai_hazard_detector",
        exist_ok=True,
        verbose=True,
        save=True,
        patience=10,
        workers=2,
    )

    elapsed_sec = time.time() - start_time
    print(f"\n✓ Training completed in {elapsed_sec:.1f} seconds ({elapsed_sec/60:.2f} minutes)")

    # Retrieve best model weights
    best_pt = BASE_DIR / "runs" / "train" / "margai_hazard_detector" / "weights" / "best.pt"
    target_pt = MODELS_DIR / "best.pt"

    if best_pt.exists():
        shutil.copy(best_pt, target_pt)
        print(f"✓ Best model weights copied to: {target_pt}")
    else:
        print(f"⚠ Warning: {best_pt} not found, checking last.pt...")
        last_pt = BASE_DIR / "runs" / "train" / "margai_hazard_detector" / "weights" / "last.pt"
        if last_pt.exists():
            shutil.copy(last_pt, target_pt)

    # Run validation to capture final metrics
    print("\n" + "=" * 65)
    print("📊 Evaluating Validation Set Performance")
    print("=" * 65)
    val_model = YOLO(str(target_pt))
    metrics = val_model.val(data=str(DATA_YAML), imgsz=imgsz, device=device)

    # Extract metrics
    map50 = float(metrics.box.map50)
    map50_95 = float(metrics.box.map)
    mp = float(metrics.box.mp)
    mr = float(metrics.box.mr)

    metrics_dict = {
        "architecture": "YOLO11n-Edge",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "targetClasses": ["pothole", "animal", "pedestrian"],
        "epochs": epochs,
        "imageSize": imgsz,
        "batchSize": batch,
        "device": device,
        "trainingDurationSeconds": round(elapsed_sec, 2),
        "metrics": {
            "mAP50": round(map50, 4),
            "mAP50_95": round(map50_95, 4),
            "precision": round(mp, 4),
            "recall": round(mr, 4),
        },
        "perClass": {
            "pothole": {"mAP50": round(float(metrics.box.all_ap[0, 0]), 4) if len(metrics.box.all_ap) > 0 else round(map50, 4)},
            "animal": {"mAP50": round(float(metrics.box.all_ap[1, 0]), 4) if len(metrics.box.all_ap) > 1 else round(map50, 4)},
            "pedestrian": {"mAP50": round(float(metrics.box.all_ap[2, 0]), 4) if len(metrics.box.all_ap) > 2 else round(map50, 4)},
        }
    }

    metrics_file = MODELS_DIR / "training_metrics.json"
    with open(metrics_file, "w") as f:
        json.dump(metrics_dict, f, indent=2)

    labels_file = MODELS_DIR / "labels.json"
    with open(labels_file, "w") as f:
        json.dump({0: "pothole", 1: "animal", 2: "pedestrian"}, f, indent=2)

    print("\n" + "=" * 65)
    print("🏆 FINAL MODEL PERFORMANCE SUMMARY")
    print("=" * 65)
    print(f"  • mAP @ 0.50 IoU:     {map50 * 100:.1f}%")
    print(f"  • mAP @ 0.50:0.95:    {map50_95 * 100:.1f}%")
    print(f"  • Mean Precision:     {mp * 100:.1f}%")
    print(f"  • Mean Recall:        {mr * 100:.1f}%")
    print(f"  • Metrics Saved:      {metrics_file}")
    print(f"  • Weights Saved:      {target_pt}")
    print("=" * 65)

    return target_pt, metrics_dict


if __name__ == "__main__":
    dev = check_environment()
    train_model(epochs=15, imgsz=320, batch=16, device=dev)
