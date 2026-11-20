# MargAI Android & Android Auto Driver Application

Native Android driver application architecture for MargAI, built for the **Google Startup Buildathon India 2026**.

## Google Mobile & Automotive Stack

1. **Google LiteRT (formerly TensorFlow Lite)**:
   - On-device edge computer vision model execution on Android NPU/GPU delegates via NNAPI.
   - Pre-trained and quantized on the Road Damage Detection 2022 (RDD2022) dataset for D40 potholes and Indian road hazards.
2. **Google ADPF (Android Dynamic Performance Framework)**:
   - `PowerManager.OnThermalStatusChangedListener` actively monitors device thermal headroom.
   - Automatically downscales camera resolution and inference FPS (30 FPS -> 15 FPS -> 8 FPS) when the device heats up under direct sun on vehicle mounts.
3. **Android for Cars App Library (Android Auto)**:
   - `MargAIAutoService` and `MargAINavigationScreen` provide native in-dash hazard visualization and audio ducking through vehicle infotainment speakers.
4. **CameraX & LocationServices (FusedLocationProviderClient)**:
   - High-precision GPS heading and accelerometer peak-G telemetry acquisition.

## Build Prerequisites
- Android Studio Hedgehog (2023.1.1) or newer
- Android SDK 34 (Android 14)
- Google Play Services (Location & Vision)
- Android Auto Desktop Head Unit (DHU) for emulator testing
