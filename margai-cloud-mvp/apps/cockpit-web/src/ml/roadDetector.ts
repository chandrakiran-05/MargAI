import { HazardType, RiskLevel, ObservationPayload, GeoEstimate, IMUTelemetry } from '@margai/contracts';

/**
 * MargAI Edge-ML Road Perception Engine
 * Runs lightweight computer vision and sensor fusion on device.
 * Employs pinhole camera geometric depth estimation and IOU multi-object tracking.
 */

export interface TrackedHazard {
  trackId: string;
  hazardType: HazardType;
  confidence: number;
  riskLevel: RiskLevel;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2] normalized 0-1
  distanceM: number;
  laneOffsetM: number;
  lastSeenMs: number;
  persistedFrames: number;
}

export class RoadPerceptionEngine {
  private activeTracks: Map<string, TrackedHazard> = new Map();
  private nextTrackId: number = 100;

  /**
   * Pinhole camera focal length constant based on typical 68-degree mobile wide lens
   */
  private readonly FOCAL_FACTOR = 0.85;

  /**
   * Real-world reference heights (meters) for optical depth triangulation
   */
  private readonly REAL_HEIGHTS: Record<HazardType, number> = {
    pothole: 0.15,
    cattle: 1.45,
    pedestrian: 1.70,
    accident: 1.50,
    debris: 0.40,
    sharp_curve: 2.0,
    speed_breaker: 0.12,
  };

  /**
   * Calculate IOU (Intersection over Union) between two normalized bounding boxes
   */
  private calculateIOU(boxA: [number, number, number, number], boxB: [number, number, number, number]): number {
    const xA = Math.max(boxA[0], boxB[0]);
    const yA = Math.max(boxA[1], boxB[1]);
    const xB = Math.min(boxA[2], boxB[2]);
    const yB = Math.min(boxA[3], boxB[3]);

    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    const boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]);
    const boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]);

    const unionArea = boxAArea + boxBArea - interArea;
    return unionArea > 0 ? interArea / unionArea : 0;
  }

  /**
   * Estimate metric distance using pinhole geometry:
   * distance = (realHeight * focalFactor) / normalizedBBoxHeight
   */
  public estimateDistance(hazardType: HazardType, bbox: [number, number, number, number]): number {
    const bboxHeight = Math.max(bbox[3] - bbox[1], 0.02);
    const realHeight = this.REAL_HEIGHTS[hazardType] || 0.5;
    const est = (realHeight * this.FOCAL_FACTOR) / bboxHeight;
    return Math.max(2.0, Math.min(300.0, Math.round(est * 10) / 10));
  }

  /**
   * Estimate lateral lane offset in meters:
   * 0 = center of vehicle lane, -1.8 = left lane/shoulder, +1.8 = right lane/shoulder
   */
  public estimateLaneOffset(bbox: [number, number, number, number]): number {
    const boxCenterX = (bbox[0] + bbox[2]) / 2;
    // Standard vehicle optical center is normalized 0.5
    // Full horizontal FOV at road horizon corresponds to ~7m carriageway
    return Math.round((boxCenterX - 0.5) * 7.0 * 10) / 10;
  }

  /**
   * Ingest raw model detection detections, update IOU tracker, and generate ObservationPayloads
   */
  public processDetections(
    rawDetections: Array<{
      hazardType: HazardType;
      confidence: number;
      bbox: [number, number, number, number];
    }>,
    geo: GeoEstimate,
    imu?: IMUTelemetry,
    deviceId: string = 'smartphone_dashcam'
  ): ObservationPayload[] {
    const now = Date.now();
    const currentFrameMatches: Set<string> = new Set();
    const emittedObservations: ObservationPayload[] = [];

    // Match each raw detection to existing tracks using IOU
    for (const det of rawDetections) {
      let bestTrackId: string | null = null;
      let highestIOU = 0.3; // IOU threshold

      for (const [trackId, track] of this.activeTracks.entries()) {
        if (track.hazardType === det.hazardType) {
          const iou = this.calculateIOU(det.bbox, track.bbox);
          if (iou > highestIOU) {
            highestIOU = iou;
            bestTrackId = trackId;
          }
        }
      }

      const dist = this.estimateDistance(det.hazardType, det.bbox);
      const laneOffset = this.estimateLaneOffset(det.bbox);

      // Assess immediate risk level based on distance and lane offset
      let risk: RiskLevel = 'information';
      if (Math.abs(laneOffset) <= 1.2) {
        if (dist <= 25) risk = 'urgent';
        else if (dist <= 65) risk = 'caution';
      } else {
        if (dist <= 30 && (det.hazardType === 'cattle' || det.hazardType === 'pedestrian')) {
          risk = 'caution';
        }
      }

      // Check if IMU shockwave escalates pothole
      if (imu && imu.zAccelG > 1.8 && det.hazardType === 'pothole') {
        risk = 'urgent';
      }

      let activeTrackId = bestTrackId;
      if (!activeTrackId) {
        activeTrackId = `trk_${this.nextTrackId++}`;
        this.activeTracks.set(activeTrackId, {
          trackId: activeTrackId,
          hazardType: det.hazardType,
          confidence: det.confidence,
          riskLevel: risk,
          bbox: det.bbox,
          distanceM: dist,
          laneOffsetM: laneOffset,
          lastSeenMs: now,
          persistedFrames: 1,
        });
      } else {
        const trk = this.activeTracks.get(activeTrackId)!;
        // Smooth Kalman/alpha-beta filter on distance and bbox
        trk.bbox = [
          trk.bbox[0] * 0.4 + det.bbox[0] * 0.6,
          trk.bbox[1] * 0.4 + det.bbox[1] * 0.6,
          trk.bbox[2] * 0.4 + det.bbox[2] * 0.6,
          trk.bbox[3] * 0.4 + det.bbox[3] * 0.6,
        ];
        trk.distanceM = Math.round((trk.distanceM * 0.3 + dist * 0.7) * 10) / 10;
        trk.laneOffsetM = laneOffset;
        trk.confidence = Math.max(trk.confidence, det.confidence);
        trk.riskLevel = risk;
        trk.lastSeenMs = now;
        trk.persistedFrames++;
      }

      currentFrameMatches.add(activeTrackId);

      const finalTrack = this.activeTracks.get(activeTrackId)!;
      // Emit observation once detection persists for at least 2 frames (eliminates jitter)
      if (finalTrack.persistedFrames >= 2) {
        emittedObservations.push({
          observationId: `obs_${finalTrack.trackId}_${now}`,
          deviceId,
          corridorId: 'in_blr_outer_ring_road',
          hazardType: finalTrack.hazardType,
          confidence: finalTrack.confidence,
          riskLevel: finalTrack.riskLevel,
          distanceM: finalTrack.distanceM,
          laneOffsetM: finalTrack.laneOffsetM,
          geo,
          imu,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Prune tracks not seen in last 1.5 seconds
    for (const [id, trk] of this.activeTracks.entries()) {
      if (now - trk.lastSeenMs > 1500) {
        this.activeTracks.delete(id);
      }
    }

    return emittedObservations;
  }

  public getActiveTracks(): TrackedHazard[] {
    return Array.from(this.activeTracks.values());
  }
}
