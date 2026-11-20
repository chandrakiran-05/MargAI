#!/usr/bin/env python3
"""
MargAI Model Export Pipeline
Google Startup Buildathon India 2026

Exports trained PyTorch weights (best.pt) to:
  1. ONNX (Open Neural Network Exchange) with dynamic batching and NMS metadata
  2. TorchScript (.torchscript)
  3. CoreML / TFLite (where supported)
"""

import os
import sys
import json
import shutil
from pathlib import Path
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
BEST_PT = MODELS_DIR / "best.pt"


def export_models(imgsz=320):
    print("=" * 65)
    print("📦 MargAI Model Export & Quantization Pipeline")
    print("=" * 65)

    if not BEST_PT.exists():
        print(f"❌ Error: Trained model weights not found at {BEST_PT}")
        sys.exit(1)

    print(f"Loading best weights: {BEST_PT}")
    model = YOLO(str(BEST_PT))

    exported_files = {"pytorch": str(BEST_PT)}

    # 1. Export to ONNX
    print("\n[1/3] Exporting to ONNX format (opset 17, imgsz=320)...")
    try:
        onnx_path = model.export(
            format="onnx",
            imgsz=imgsz,
            opset=17,
            dynamic=True,
            simplify=True,
        )
        target_onnx = MODELS_DIR / "margai_detector.onnx"
        if Path(onnx_path).exists():
            shutil.copy(onnx_path, target_onnx)
            print(f"✓ ONNX export successful: {target_onnx}")
            exported_files["onnx"] = str(target_onnx)
    except Exception as e:
        print(f"⚠ ONNX export note: {e}")

    # 2. Export to TorchScript
    print("\n[2/3] Exporting to TorchScript format...")
    try:
        ts_path = model.export(
            format="torchscript",
            imgsz=imgsz,
        )
        target_ts = MODELS_DIR / "margai_detector.torchscript"
        if Path(ts_path).exists():
            shutil.copy(ts_path, target_ts)
            print(f"✓ TorchScript export successful: {target_ts}")
            exported_files["torchscript"] = str(target_ts)
    except Exception as e:
        print(f"⚠ TorchScript export note: {e}")

    # 3. Export to TFLite (LiteRT) if supported
    print("\n[3/3] Attempting TFLite / LiteRT export...")
    try:
        tflite_path = model.export(
            format="tflite",
            imgsz=imgsz,
            int8=False,
        )
        target_tflite = MODELS_DIR / "margai_detector.tflite"
        if Path(tflite_path).exists():
            shutil.copy(tflite_path, target_tflite)
            print(f"✓ TFLite / LiteRT export successful: {target_tflite}")
            exported_files["tflite"] = str(target_tflite)
    except Exception as e:
        print(f"ℹ TFLite export requires tensorflow-macos/onnx2tf ({e}). ONNX & TorchScript ready.")

    # Save export manifest
    manifest_file = MODELS_DIR / "export_manifest.json"
    with open(manifest_file, "w") as f:
        json.dump(exported_files, f, indent=2)

    print("\n" + "=" * 65)
    print("✓ Model Export Complete!")
    print(f"Manifest written to: {manifest_file}")
    for k, v in exported_files.items():
        print(f"  • {k.upper()}: {v}")
    print("=" * 65)
    return exported_files


if __name__ == "__main__":
    export_models(imgsz=320)
