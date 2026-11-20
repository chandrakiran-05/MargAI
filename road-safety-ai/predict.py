"""
CLI Prediction and Video Inference Script for Road Safety AI
Usage:
  python predict.py --source 0                      # Live webcam
  python predict.py --source path/to/video.mp4       # Video file
  python predict.py --source path/to/image.jpg       # Single image
  python predict.py --source rtsp://...              # IP Camera / mobile stream
"""

import os
import sys
import argparse
import time
import cv2
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Ensure root import works as road_safety_ai or local
parent_dir = ROOT_DIR.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

from road_safety_ai.inference.pipeline import RoadSafetyPipeline

def run_prediction(
    source: str,
    weights: str = "road-safety-ai/models/best.pt",
    conf_thresh: float = 0.35,
    save_output: bool = True,
    output_dir: str = "road-safety-ai/inference/output",
    show_window: bool = False
):
    print("=" * 60)
    print(f"ROAD SAFETY AI INFERENCE: Source='{source}'")
    print("=" * 60)

    pipeline = RoadSafetyPipeline(model_path=weights, conf_threshold=conf_thresh)
    os.makedirs(output_dir, exist_ok=True)

    # Check if single image
    if os.path.isfile(source) and source.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp')):
        img = cv2.imread(source)
        if img is None:
            print(f"Error: Unable to load image from {source}")
            return
        annotated, hazards, telemetry = pipeline.process_frame(img)
        
        out_path = os.path.join(output_dir, f"annotated_{os.path.basename(source)}")
        if save_output:
            cv2.imwrite(out_path, annotated)
            print(f"Annotated output saved to: {out_path}")
            
        print(f"Hazards Detected: {len(hazards)}")
        for hz in hazards:
            print(f" - [{hz['risk_level']}] {hz['hazard_type']} (Conf: {int(hz['confidence']*100)}%, Dist: {hz.get('distance_m', 'N/A')}m)")
        print(f"Road Geometry: {telemetry['road_geometry']}")
        return

    # Video or Camera Stream
    try:
        src_int = int(source)
        cap = cv2.VideoCapture(src_int)
    except ValueError:
        cap = cv2.VideoCapture(source)

    if not cap.isOpened():
        print(f"Error: Unable to open video source '{source}'")
        return

    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps_in = cap.get(cv2.CAP_PROP_FPS) or 30.0

    out_video_path = os.path.join(output_dir, "annotated_output.mp4")
    writer = None
    if save_output:
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        writer = cv2.VideoWriter(out_video_path, fourcc, fps_in, (w, h))

    frame_count = 0
    t_start = time.time()

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_count += 1

            annotated, hazards, telemetry = pipeline.process_frame(frame)

            if writer:
                writer.write(annotated)

            if show_window:
                cv2.imshow("Road Safety AI - Live HUD", annotated)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break

            if frame_count % 30 == 0:
                elapsed = time.time() - t_start
                curr_fps = frame_count / max(0.01, elapsed)
                print(f"[Frame {frame_count:04d}] Process FPS: {curr_fps:.1f} | Active Hazards: {len(hazards)} | Curve: {telemetry['road_geometry']['curve_type']}")

    finally:
        cap.release()
        if writer:
            writer.release()
            print(f"Processed video saved to: {out_video_path}")
        if show_window:
            cv2.destroyAllWindows()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Road Safety AI Predictor")
    parser.add_argument("--source", type=str, default="0", help="Webcam index, video file path, or image path")
    parser.add_argument("--weights", type=str, default="road-safety-ai/models/best.pt", help="Path to weights file")
    parser.add_argument("--conf", type=float, default=0.35, help="Confidence threshold")
    parser.add_argument("--save", action="store_true", default=True, help="Save annotated output")
    parser.add_argument("--show", action="store_true", default=False, help="Display live OpenCV window")
    args = parser.parse_args()

    run_prediction(
        source=args.source,
        weights=args.weights,
        conf_thresh=args.conf,
        save_output=args.save,
        show_window=args.show
    )
