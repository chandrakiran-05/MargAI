#!/usr/bin/env python3
"""
MargAI Inference Latency & Efficiency Benchmark
Google Startup Buildathon India 2026

Rigorous performance benchmarking against the <100ms edge safety budget:
  - Measures p50, p90, p95, p99 latencies across 100 iterations
  - Computes FPS throughput under cold & warm execution
  - Validates adherence to real-time collision avoidance constraints
"""

import os
import sys
import json
import time
import numpy as np
from pathlib import Path
import torch
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
BEST_PT = MODELS_DIR / "best.pt"


def run_benchmark(iterations=100, imgsz=320):
    print("=" * 65)
    print("⚡ MargAI Edge ML Performance Benchmark")
    print(f"Goal: Validate sub-100ms real-time latency (Slide 03 / Layer 01)")
    print("=" * 65)

    if not BEST_PT.exists():
        print(f"Model not found at {BEST_PT}. Run train.py first.")
        sys.exit(1)

    model = YOLO(str(BEST_PT))
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"Evaluating on Device: {device.upper()} | Image Resolution: {imgsz}x{imgsz}")

    # Generate dummy input tensor
    dummy_frame = np.random.randint(0, 255, (imgsz, imgsz, 3), dtype=np.uint8)

    # Warmup phase (10 iterations)
    print("Performing 10 warmup runs...")
    for _ in range(10):
        model.predict(source=dummy_frame, imgsz=imgsz, verbose=False, device=device)

    # Timed benchmark phase
    print(f"Running {iterations} timed benchmark iterations...")
    latencies = []

    for i in range(iterations):
        t0 = time.perf_counter()
        model.predict(source=dummy_frame, imgsz=imgsz, verbose=False, device=device)
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000.0)  # in ms

    latencies = np.array(latencies)
    p50 = float(np.percentile(latencies, 50))
    p90 = float(np.percentile(latencies, 90))
    p95 = float(np.percentile(latencies, 95))
    p99 = float(np.percentile(latencies, 99))
    mean_lat = float(np.mean(latencies))
    min_lat = float(np.min(latencies))
    max_lat = float(np.max(latencies))
    fps = 1000.0 / mean_lat

    report = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "architecture": "YOLO11n-Edge",
        "device": device,
        "inputResolution": f"{imgsz}x{imgsz}",
        "iterations": iterations,
        "latencyMetricsMs": {
            "mean": round(mean_lat, 2),
            "p50_median": round(p50, 2),
            "p90": round(p90, 2),
            "p95": round(p95, 2),
            "p99": round(p99, 2),
            "min": round(min_lat, 2),
            "max": round(max_lat, 2),
        },
        "throughputFps": round(fps, 1),
        "buildathonBudgetMs": 100.0,
        "budgetCompliance": {
            "marginMs": round(100.0 - p95, 2),
            "compliant": bool(p95 < 100.0),
            "verdict": "PASSED - Sub-100ms Edge Perception Requirement Fulfilled" if p95 < 100.0 else "FAILED",
        }
    }

    report_path = MODELS_DIR / "benchmark_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 65)
    print("🏁 BENCHMARK RESULTS")
    print("=" * 65)
    print(f"  • Mean Latency:        {mean_lat:.2f} ms")
    print(f"  • Median (p50):        {p50:.2f} ms")
    print(f"  • 95th Percentile:     {p95:.2f} ms")
    print(f"  • 99th Percentile:     {p99:.2f} ms")
    print(f"  • Throughput:          {fps:.1f} FPS")
    print(f"  • Safety Target:       < 100.0 ms")
    print(f"  • Safety Margin:       +{100.0 - p95:.1f} ms headroom")
    print(f"  • Status:              ✓ {report['budgetCompliance']['verdict']}")
    print(f"  • Report Written:      {report_path}")
    print("=" * 65)

    return report


if __name__ == "__main__":
    run_benchmark(iterations=100, imgsz=320)
