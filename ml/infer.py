#!/usr/bin/env python3
"""
MargAI Hazard Perception Inference Engine
Google Startup Buildathon India 2026

Runs forward inference on road camera images or video frames.
Annotates detections with Google logo colors:
  - Pothole:    Google Red    #EA4335 (BGR: 53, 67, 234)
  - Animal:     Google Yellow #FBBC05 (BGR: 5, 188, 251)
  - Pedestrian: Google Blue   #4285F4 (BGR: 244, 133, 66)

Outputs JSON conforming to MargAI FrameDetection schema.
"""

import os
import sys
import json
import time
import cv2
import numpy as np
from pathlib import Path
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
BEST_PT = MODELS_DIR / "best.pt"
OUTPUT_DIR = BASE_DIR / "inference" / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Google brand color palette in BGR format for OpenCV
GOOGLE_COLORS_BGR = {
    "pothole": (53, 67, 234),       # Google Red #EA4335
    "animal": (5, 188, 251),        # Google Yellow #FBBC05
    "pedestrian": (244, 133, 66),   # Google Blue #4285F4
}

CLASS_MAP = {0: "pothole", 1: "animal", 2: "pedestrian"}


def load_model(weights_path=None):
    path = weights_path or BEST_PT
    if not Path(path).exists():
        raise FileNotFoundError(f"Weights file not found: {path}. Run train.py first.")
    return YOLO(str(path))


def predict_frame(model, image_path_or_array, conf_threshold=0.35, imgsz=320):
    start_t = time.time()
    
    if isinstance(image_path_or_array, (str, Path)):
        img = cv2.imread(str(image_path_or_array))
        if img is None:
            raise ValueError(f"Could not read image: {image_path_or_array}")
    else:
        img = image_path_or_array.copy()

    h, w = img.shape[:2]

    # Run inference
    results = model.predict(
        source=img,
        conf=conf_threshold,
        imgsz=imgsz,
        verbose=False,
    )

    elapsed_ms = (time.time() - start_t) * 1000.0
    detections = []
    annotated_img = img.copy()

    r = results[0]
    boxes = r.boxes

    for i in range(len(boxes)):
        box = boxes[i]
        cls_id = int(box.cls[0].item())
        cls_name = CLASS_MAP.get(cls_id, f"hazard_{cls_id}")
        conf = float(box.conf[0].item())

        # Pixel coords [x1, y1, x2, y2]
        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
        
        # Normalized coords for MargAI contract
        norm_x = round(float(x1) / w, 4)
        norm_y = round(float(y1) / h, 4)
        norm_w = round(float(x2 - x1) / w, 4)
        norm_h = round(float(y2 - y1) / h, 4)

        color = GOOGLE_COLORS_BGR.get(cls_name, (200, 200, 200))

        # Estimate depth / distance
        depth_m = None
        if cls_name == "pothole":
            # Rough monocular depth heuristic based on vertical position
            depth_m = round(max(0.04, min(0.25, 0.08 * (1.0 + norm_h * 2))), 3)

        detections.append({
            "class": cls_name,
            "confidence": round(conf, 4),
            "bbox": {
                "x": norm_x,
                "y": norm_y,
                "width": norm_w,
                "height": norm_h,
            },
            "frameTimeMs": round(elapsed_ms, 2),
            "depthEstimateM": depth_m,
            "modelVersion": "margai-yolo11n-v1.0",
        })

        # Render corner-bracket automotive HUD overlay
        bCorner = max(6, int(min(x2 - x1, y2 - y1) * 0.25))
        cv2.rectangle(annotated_img, (x1, y1), (x2, y2), color, 1)

        # Thick corner brackets
        th = 3
        # Top-left
        cv2.line(annotated_img, (x1, y1), (x1 + bCorner, y1), color, th)
        cv2.line(annotated_img, (x1, y1), (x1, y1 + bCorner), color, th)
        # Top-right
        cv2.line(annotated_img, (x2, y1), (x2 - bCorner, y1), color, th)
        cv2.line(annotated_img, (x2, y1), (x2, y1 + bCorner), color, th)
        # Bottom-left
        cv2.line(annotated_img, (x1, y2), (x1 + bCorner, y2), color, th)
        cv2.line(annotated_img, (x1, y2), (x1, y2 - bCorner), color, th)
        # Bottom-right
        cv2.line(annotated_img, (x2, y2), (x2 - bCorner, y2), color, th)
        cv2.line(annotated_img, (x2, y2), (x2, y2 - bCorner), color, th)

        # Label pill
        label_text = f"{cls_name.upper()} {int(conf * 100)}%"
        (tw, th_box), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        cv2.rectangle(annotated_img, (x1, max(0, y1 - 20)), (x1 + tw + 10, y1), color, -1)
        cv2.putText(annotated_img, label_text, (x1 + 5, max(14, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

    # Top Telemetry Header on annotated image
    header_text = f"MargAI LiteRT NPU · {len(detections)} Hazards · Latency: {elapsed_ms:.1f}ms"
    cv2.rectangle(annotated_img, (0, 0), (w, 28), (9, 13, 22), -1)
    cv2.putText(annotated_img, header_text, (10, 19), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (66, 133, 244), 1, cv2.LINE_AA)

    return detections, annotated_img, elapsed_ms


def run_batch_inference():
    print("=" * 65)
    print("🚗 MargAI Road Hazard Inference Runner")
    print("=" * 65)

    model = load_model()
    test_dir = BASE_DIR / "test_samples"
    test_files = sorted(list(test_dir.glob("*.jpg")))[:8]

    if not test_files:
        print(f"No test images found in {test_dir}")
        return

    print(f"Processing {len(test_files)} test samples...")
    results_summary = []

    for img_path in test_files:
        detections, annotated, lat_ms = predict_frame(model, img_path)
        out_path = OUTPUT_DIR / f"annotated_{img_path.name}"
        cv2.imwrite(str(out_path), annotated)

        classes_found = [d["class"] for d in detections]
        print(f"  • {img_path.name}: {len(detections)} hazards {classes_found} in {lat_ms:.1f}ms -> {out_path.name}")

        results_summary.append({
            "image": img_path.name,
            "latencyMs": round(lat_ms, 2),
            "hazardCount": len(detections),
            "detections": detections,
            "output": str(out_path),
        })

    summary_file = OUTPUT_DIR / "inference_summary.json"
    with open(summary_file, "w") as f:
        json.dump(results_summary, f, indent=2)

    print(f"\n✓ Batch inference finished. Results saved to: {summary_file}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        model = load_model()
        target = sys.argv[1]
        dets, ann, lat = predict_frame(model, target)
        print(json.dumps(dets, indent=2))
    else:
        run_batch_inference()
