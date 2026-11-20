"""
Model Training Script for Road Safety AI
Trains Ultralytics YOLO on the real-world Road Hazard Dataset.
Uses Apple Silicon MPS GPU acceleration, early stopping, LR scheduling, and model checkpointing.
Exports evaluated metrics (Precision, Recall, F1, mAP@50, mAP@50-95) and ONNX weights.
"""

import os
import sys
import json
import torch
from pathlib import Path
from ultralytics import YOLO

def train_road_safety_model(
    data_yaml: str,
    epochs: int = 15,
    imgsz: int = 320,
    batch_size: int = 16,
    pretrained_weights: str = "yolo11n.pt",
    output_dir: str = "road-safety-ai/models"
):
    print("=" * 60)
    print("STARTING ROAD SAFETY AI MODEL TRAINING")
    print("=" * 60)

    # 1. Device Selection (MPS GPU on Apple Silicon, else CUDA, else CPU)
    if torch.backends.mps.is_available():
        device = "mps"
        print("Hardware Acceleration: Apple Silicon MPS (Metal Performance Shaders) ACTIVE")
    elif torch.cuda.is_available():
        device = "0"
        print("Hardware Acceleration: NVIDIA CUDA GPU ACTIVE")
    else:
        device = "cpu"
        print("Hardware Acceleration: CPU Fallback")

    # 2. Initialize Pretrained YOLO Model
    print(f"Loading pretrained base model: {pretrained_weights}")
    model = YOLO(pretrained_weights)

    # 3. Execute Fine-Tuning
    os.makedirs(output_dir, exist_ok=True)
    project_dir = os.path.join(output_dir, "runs")
    
    print(f"Training parameters: epochs={epochs}, imgsz={imgsz}, batch={batch_size}, device={device}")
    
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch_size,
        device=device,
        project=project_dir,
        name="road_safety_detector",
        patience=20,
        save=True,
        save_period=5,
        val=True,
        plots=True,
        verbose=True,
        lr0=0.005,
        lrf=0.05,
        warmup_epochs=1
    )

    # 4. Independent Validation and Metrics Extraction
    print("\n" + "=" * 60)
    print("EVALUATING MODEL ON VALIDATION DATASET")
    print("=" * 60)
    
    metrics = model.val()
    
    # Extract exact metrics from Ultralytics metrics object
    mp = float(metrics.box.mp)        # Mean Precision
    mr = float(metrics.box.mr)        # Mean Recall
    map50 = float(metrics.box.map50)  # mAP@50
    map50_95 = float(metrics.box.map) # mAP@50-95
    f1 = float(2 * (mp * mr) / (mp + mr + 1e-6)) # F1-score

    print(f"Mean Precision:  {mp:.4f}")
    print(f"Mean Recall:     {mr:.4f}")
    print(f"F1-Score:        {f1:.4f}")
    print(f"mAP@50:          {map50:.4f}")
    print(f"mAP@50-95:       {map50_95:.4f}")

    # Per-class metrics
    class_names = ['pothole', 'animal', 'pedestrian', 'vehicle', 'accident', 'debris']
    per_class = {}
    if hasattr(metrics.box, 'maps') and len(metrics.box.maps) > 0:
        for idx, c_name in enumerate(class_names):
            if idx < len(metrics.box.maps):
                per_class[c_name] = {
                    "mAP50_95": round(float(metrics.box.maps[idx]), 4)
                }
    
    # 5. Save best weights and metrics report
    save_dir = Path(results.save_dir) if hasattr(results, 'save_dir') else Path(project_dir) / "road_safety_detector"
    best_weight_src = save_dir / "weights" / "best.pt"
    best_weight_dest = Path(output_dir) / "best.pt"
    
    if best_weight_src.exists():
        import shutil
        shutil.copy2(best_weight_src, best_weight_dest)
        print(f"Best model weights saved to: {best_weight_dest}")
    
    # 6. Export to ONNX format
    try:
        print("Exporting trained model to ONNX format...")
        onnx_path = model.export(format="onnx", imgsz=imgsz, dynamic=False)
        target_onnx = Path(output_dir) / "road_safety_detector.onnx"
        if Path(onnx_path).exists():
            import shutil
            shutil.copy2(onnx_path, target_onnx)
            print(f"ONNX model saved to: {target_onnx}")
    except Exception as e:
        print(f"ONNX export notice: {e}")

    # 7. Write Evaluation Report
    report = {
        "hardware": device,
        "epochs": epochs,
        "image_size": imgsz,
        "batch_size": batch_size,
        "overall_metrics": {
            "mean_precision": round(mp, 4),
            "mean_recall": round(mr, 4),
            "f1_score": round(f1, 4),
            "mAP_50": round(map50, 4),
            "mAP_50_95": round(map50_95, 4)
        },
        "per_class_performance": per_class,
        "model_paths": {
            "pytorch_best": str(best_weight_dest.resolve()),
            "onnx": str((Path(output_dir) / "road_safety_detector.onnx").resolve())
        }
    }

    report_path = Path(output_dir) / "evaluation_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"Model evaluation report written to: {report_path}")

    return report

if __name__ == "__main__":
    yaml_path = os.path.abspath("road-safety-ai/datasets/road_hazard/data.yaml")
    train_road_safety_model(data_yaml=yaml_path, epochs=15, imgsz=320, batch_size=16)
