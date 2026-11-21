/**
 * MargAI Real-Time Hazard Detection Engine
 * 
 * Runs TensorFlow.js COCO-SSD on smartphone camera frames to detect:
 *   - PEDESTRIAN (person class)
 *   - ANIMAL (cow, dog, cat, horse, sheep, elephant, bear)
 *   - POTHOLE (dark patch analysis on road region)
 *   - WATERLOGGING (blue/brown water region analysis on road)
 * 
 * Detections are tagged with GPS coordinates for geofenced alerts.
 */

import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

// ── Types ──────────────────────────────────────────────────────────

export type HazardType = 'PEDESTRIAN' | 'ANIMAL' | 'POTHOLE' | 'WATERLOGGING';

export interface DetectedHazard {
  hazard_type: HazardType;
  /** Bounding box as percentages [left%, top%, right%, bottom%] */
  bbox: [number, number, number, number];
  confidence: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  distance_m: number;
  label: string;
  /** GPS coordinates where detection occurred */
  geo?: { lat: number; lng: number; accuracy: number };
  timestamp: number;
}

export interface DetectionResult {
  hazards: DetectedHazard[];
  fps: number;
  inferenceMs: number;
  frameWidth: number;
  frameHeight: number;
}

// ── COCO-SSD Class Mapping ─────────────────────────────────────────

const PERSON_CLASSES = new Set(['person']);
const ANIMAL_CLASSES = new Set([
  'dog', 'cat', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'bird',
]);

// Minimum confidence thresholds
const MIN_CONFIDENCE_PERSON = 0.45;
const MIN_CONFIDENCE_ANIMAL = 0.40;
const MIN_CONFIDENCE_ROAD_HAZARD = 0.35;

// ── Singleton Detection Engine ─────────────────────────────────────

let model: cocoSsd.ObjectDetection | null = null;
let isLoading = false;
let loadError: string | null = null;

/**
 * Load the COCO-SSD model (lazy singleton).
 * Uses the 'lite_mobilenet_v2' base for fast mobile inference.
 */
export async function loadDetectionModel(): Promise<boolean> {
  if (model) return true;
  if (isLoading) return false;

  isLoading = true;
  loadError = null;

  try {
    // Set WebGL backend for GPU acceleration on mobile
    await tf.setBackend('webgl');
    await tf.ready();

    model = await cocoSsd.load({
      base: 'lite_mobilenet_v2', // Fastest model for mobile
    });

    console.log('[HazardDetector] COCO-SSD model loaded successfully');
    isLoading = false;
    return true;
  } catch (err: any) {
    console.error('[HazardDetector] Model load failed:', err);
    loadError = err.message || 'Model load failed';
    isLoading = false;
    return false;
  }
}

export function getModelStatus(): { loaded: boolean; loading: boolean; error: string | null } {
  return { loaded: !!model, loading: isLoading, error: loadError };
}

// ── Road Surface Analysis (Pothole & Waterlogging) ─────────────────

interface RoadSurfaceHazard {
  type: HazardType;
  bbox: [number, number, number, number];
  confidence: number;
}

/**
 * Analyze the lower portion of the camera frame for road surface hazards.
 * Uses pixel color statistics to detect:
 *   - Dark patches (potholes) in the road region
 *   - Blue/brown water regions (waterlogging)
 */
function analyzeRoadSurface(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): RoadSurfaceHazard[] {
  const results: RoadSurfaceHazard[] = [];

  // Analyze only the bottom 45% of the frame (road surface area)
  const roadTop = Math.floor(height * 0.55);
  const roadHeight = height - roadTop;
  const regionW = Math.floor(width / 4);
  const regionH = Math.floor(roadHeight / 2);

  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 2; row++) {
      const rx = col * regionW;
      const ry = roadTop + row * regionH;
      const rw = Math.min(regionW, width - rx);
      const rh = Math.min(regionH, height - ry);

      if (rw <= 0 || rh <= 0) continue;

      let imageData: ImageData;
      try {
        imageData = ctx.getImageData(rx, ry, rw, rh);
      } catch (e) {
        continue;
      }
      const data = imageData.data;
      const totalPixels = rw * rh;

      let darkCount = 0;
      let waterCount = 0;
      let totalR = 0, totalG = 0, totalB = 0;

      // Sample every 4th pixel for speed
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        totalR += r;
        totalG += g;
        totalB += b;

        const brightness = (r + g + b) / 3;

        // Dark patch detection (pothole signature)
        if (brightness < 45 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20) {
          darkCount++;
        }

        // Water detection (blue-ish or brown-murky tones)
        if ((b > r + 25 && b > g + 10 && brightness > 40 && brightness < 180) ||
            (r > 80 && g > 60 && b < 70 && brightness > 50 && brightness < 140)) {
          waterCount++;
        }
      }

      const sampledPixels = Math.floor(totalPixels / 4);
      if (sampledPixels === 0) continue;

      const darkRatio = darkCount / sampledPixels;
      const waterRatio = waterCount / sampledPixels;

      // Convert region coords to percentage bbox
      const bboxPct: [number, number, number, number] = [
        (rx / width) * 100,
        (ry / height) * 100,
        ((rx + rw) / width) * 100,
        ((ry + rh) / height) * 100,
      ];

      if (darkRatio > 0.25) {
        results.push({
          type: 'POTHOLE',
          bbox: bboxPct,
          confidence: Math.min(0.95, 0.5 + darkRatio),
        });
      }

      if (waterRatio > 0.20) {
        results.push({
          type: 'WATERLOGGING',
          bbox: bboxPct,
          confidence: Math.min(0.90, 0.45 + waterRatio),
        });
      }
    }
  }

  return results;
}

// ── Distance Estimation ────────────────────────────────────────────

/**
 * Rough distance estimate based on bounding box position in frame.
 * Objects higher in frame → further away.
 */
function estimateDistance(bboxTopPct: number, bboxHeightPct: number): number {
  // Top of bbox as fraction (0 = top of frame, 100 = bottom)
  const verticalPosition = bboxTopPct + bboxHeightPct / 2;

  if (verticalPosition < 30) return 150; // Far
  if (verticalPosition < 45) return 100;
  if (verticalPosition < 55) return 60;
  if (verticalPosition < 70) return 35;
  if (verticalPosition < 85) return 15;
  return 8; // Very close
}

function assessRisk(hazardType: HazardType, distance: number, confidence: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (hazardType === 'PEDESTRIAN' || hazardType === 'ANIMAL') {
    if (distance < 30) return 'CRITICAL';
    if (distance < 60) return 'HIGH';
    if (distance < 100) return 'MEDIUM';
    return 'LOW';
  }
  // Road surface hazards
  if (distance < 20) return 'HIGH';
  if (distance < 50) return 'MEDIUM';
  return 'LOW';
}

// ── GPS Geolocation ────────────────────────────────────────────────

let currentGeoPosition: { lat: number; lng: number; accuracy: number } | null = null;
let geoWatchId: number | null = null;

export function startGeoTracking() {
  if (geoWatchId !== null) return;
  if (!('geolocation' in navigator)) return;

  geoWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      currentGeoPosition = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
    },
    (err) => {
      console.warn('[GeoTracker] GPS error:', err.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 5000,
    },
  );
}

export function stopGeoTracking() {
  if (geoWatchId !== null) {
    navigator.geolocation.clearWatch(geoWatchId);
    geoWatchId = null;
  }
}

export function getCurrentPosition() {
  return currentGeoPosition;
}

// ── Main Detection Function ────────────────────────────────────────

/**
 * Run full hazard detection on a video frame.
 * Combines COCO-SSD (pedestrian/animal) + road surface analysis (pothole/waterlogging).
 */
export async function detectHazards(
  videoElement: HTMLVideoElement,
  analysisCanvas: HTMLCanvasElement,
): Promise<DetectionResult> {
  const startMs = performance.now();
  const hazards: DetectedHazard[] = [];

  const vw = videoElement.videoWidth || videoElement.width || 320;
  const vh = videoElement.videoHeight || videoElement.height || 240;

  if (vw === 0 || vh === 0 || videoElement.readyState < 2) {
    return { hazards: [], fps: 0, inferenceMs: 0, frameWidth: vw, frameHeight: vh };
  }

  // ── 1. COCO-SSD Object Detection (Pedestrians & Animals) ──

  if (model) {
    try {
      const predictions = await model.detect(videoElement, 10, 0.35);

      for (const pred of predictions) {
        const cls = pred.class.toLowerCase();
        let hazardType: HazardType | null = null;
        let label = pred.class;

        if (PERSON_CLASSES.has(cls) && pred.score >= MIN_CONFIDENCE_PERSON) {
          hazardType = 'PEDESTRIAN';
          label = 'Person';
        } else if (ANIMAL_CLASSES.has(cls) && pred.score >= MIN_CONFIDENCE_ANIMAL) {
          hazardType = 'ANIMAL';
          label = cls.charAt(0).toUpperCase() + cls.slice(1);
        }

        if (!hazardType) continue;

        // Convert pixel bbox → percentage bbox
        const bboxPct: [number, number, number, number] = [
          (pred.bbox[0] / vw) * 100,
          (pred.bbox[1] / vh) * 100,
          ((pred.bbox[0] + pred.bbox[2]) / vw) * 100,
          ((pred.bbox[1] + pred.bbox[3]) / vh) * 100,
        ];

        const topPct = bboxPct[1];
        const heightPct = bboxPct[3] - bboxPct[1];
        const distance = estimateDistance(topPct, heightPct);
        const risk = assessRisk(hazardType, distance, pred.score);

        hazards.push({
          hazard_type: hazardType,
          bbox: bboxPct,
          confidence: Math.round(pred.score * 100) / 100,
          risk_level: risk,
          distance_m: distance,
          label,
          geo: currentGeoPosition || undefined,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.warn('[HazardDetector] COCO-SSD inference error:', err);
    }
  }

  // ── 2. Road Surface Analysis (Pothole & Waterlogging) ──

  try {
    analysisCanvas.width = 160; // Low-res for speed
    analysisCanvas.height = 120;
    const ctx = analysisCanvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(videoElement, 0, 0, 160, 120);

      const surfaceHazards = analyzeRoadSurface(analysisCanvas, ctx, 160, 120);

      for (const sh of surfaceHazards) {
        if (sh.confidence < MIN_CONFIDENCE_ROAD_HAZARD) continue;

        const topPct = sh.bbox[1];
        const heightPct = sh.bbox[3] - sh.bbox[1];
        const distance = estimateDistance(topPct, heightPct);
        const risk = assessRisk(sh.type, distance, sh.confidence);

        hazards.push({
          hazard_type: sh.type,
          bbox: sh.bbox,
          confidence: Math.round(sh.confidence * 100) / 100,
          risk_level: risk,
          distance_m: distance,
          label: sh.type === 'POTHOLE' ? 'Pothole' : 'Waterlogging',
          geo: currentGeoPosition || undefined,
          timestamp: Date.now(),
        });
      }
    }
  } catch (err) {
    // Canvas analysis failed silently
  }

  const inferenceMs = Math.round(performance.now() - startMs);
  const fps = inferenceMs > 0 ? Math.round(1000 / inferenceMs) : 0;

  return { hazards, fps, inferenceMs, frameWidth: vw, frameHeight: vh };
}
