#!/usr/bin/env python3
"""
MargAI INT8 Quantization Pipeline
Google Startup Buildathon India 2026

Quantizes the trained FP32 ONNX model to INT8 precision:
  - Weight quantization: 8-bit signed integer (INT8)
  - Reduces model size from ~10.4MB down to ~2.7MB (74% footprint reduction)
  - Ideal for Android Edge NPU / DSP delegates and heat-sensitive dashcam operation
"""

import os
import sys
import json
import time
from pathlib import Path
import numpy as np
import onnx
import onnxruntime as ort
from onnxruntime.quantization import quantize_dynamic, QuantType

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
INPUT_ONNX = MODELS_DIR / "margai_detector.onnx"
OUTPUT_INT8_ONNX = MODELS_DIR / "margai_detector_int8.onnx"


def run_int8_quantization():
    print("=" * 65)
    print("⚡ MargAI Edge Model INT8 Post-Training Quantization")
    print("=" * 65)

    if not INPUT_ONNX.exists():
        print(f"❌ Error: Source ONNX model not found at {INPUT_ONNX}")
        sys.exit(1)

    orig_size_bytes = os.path.getsize(INPUT_ONNX)
    orig_size_mb = orig_size_bytes / (1024 * 1024)
    print(f"Source Model: {INPUT_ONNX}")
    print(f"Source Size:  {orig_size_mb:.2f} MB")

    # Perform Dynamic INT8 Quantization
    print("\nQuantizing weights to INT8 precision...")
    t0 = time.time()
    quantize_dynamic(
        model_input=str(INPUT_ONNX),
        model_output=str(OUTPUT_INT8_ONNX),
        weight_type=QuantType.QInt8,
        per_channel=True,
    )
    quant_time = time.time() - t0
    print(f"✓ Quantization completed in {quant_time:.2f}s")

    int8_size_bytes = os.path.getsize(OUTPUT_INT8_ONNX)
    int8_size_mb = int8_size_bytes / (1024 * 1024)
    compression_ratio = orig_size_mb / int8_size_mb
    savings_pct = (1.0 - (int8_size_mb / orig_size_mb)) * 100.0

    print(f"Quantized Model: {OUTPUT_INT8_ONNX}")
    print(f"Quantized Size:  {int8_size_mb:.2f} MB")
    print(f"Compression:     {compression_ratio:.2f}x ({savings_pct:.1f}% storage reduction)")

    # Benchmark ONNX Runtime: FP32 vs INT8
    print("\n" + "=" * 65)
    print("⏱ Benchmarking ONNX Runtime Inference (FP32 vs INT8)")
    print("=" * 65)

    dummy_input = np.random.randn(1, 3, 320, 320).astype(np.float32)

    # 1. FP32 Session
    sess_fp32 = ort.InferenceSession(str(INPUT_ONNX), providers=["CPUExecutionProvider"])
    input_name_fp32 = sess_fp32.get_inputs()[0].name
    for _ in range(5):
        sess_fp32.run(None, {input_name_fp32: dummy_input})

    fp32_times = []
    for _ in range(50):
        start = time.perf_counter()
        sess_fp32.run(None, {input_name_fp32: dummy_input})
        fp32_times.append((time.perf_counter() - start) * 1000.0)

    # 2. INT8 Session
    sess_int8 = ort.InferenceSession(str(OUTPUT_INT8_ONNX), providers=["CPUExecutionProvider"])
    input_name_int8 = sess_int8.get_inputs()[0].name
    for _ in range(5):
        sess_int8.run(None, {input_name_int8: dummy_input})

    int8_times = []
    for _ in range(50):
        start = time.perf_counter()
        sess_int8.run(None, {input_name_int8: dummy_input})
        int8_times.append((time.perf_counter() - start) * 1000.0)

    mean_fp32 = float(np.mean(fp32_times))
    mean_int8 = float(np.mean(int8_times))
    p95_int8 = float(np.percentile(int8_times, 95))

    report = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "architecture": "YOLO11n-Edge",
        "precision": "INT8 (8-bit Quantized)",
        "sourceModelMb": round(orig_size_mb, 2),
        "quantizedModelMb": round(int8_size_mb, 2),
        "reductionPercentage": round(savings_pct, 1),
        "compressionRatio": round(compression_ratio, 2),
        "onnxRuntimeBenchmarkMs": {
            "fp32MeanMs": round(mean_fp32, 2),
            "int8MeanMs": round(mean_int8, 2),
            "int8P95Ms": round(p95_int8, 2),
            "speedupFactor": round(mean_fp32 / max(0.001, mean_int8), 2),
        },
        "mobileNpuTarget": "Google LiteRT / Android NNAPI / Qualcomm Hexagon DSP",
        "thermalProfile": "Low-Heat Edge Operation (ADPF Thermal Mitigation Ready)",
    }

    report_path = MODELS_DIR / "quantization_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    # Update export manifest
    manifest_path = MODELS_DIR / "export_manifest.json"
    if manifest_path.exists():
        with open(manifest_path) as f:
            manifest = json.load(f)
        manifest["onnx_int8"] = str(OUTPUT_INT8_ONNX)
        manifest["quantizationReport"] = str(report_path)
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2)

    print(f"FP32 Mean Latency: {mean_fp32:.2f} ms")
    print(f"INT8 Mean Latency: {mean_int8:.2f} ms (p95: {p95_int8:.2f} ms)")
    print(f"Speedup:           {mean_fp32/mean_int8:.2f}x")
    print(f"Report Written:    {report_path}")
    print("=" * 65)
    return report


if __name__ == "__main__":
    run_int8_quantization()
