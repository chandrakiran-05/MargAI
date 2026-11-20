import {
  ObservationPayload,
  DriverAlert,
  RiskLevel,
  GeoEstimate,
  getStandardLocalizedPhrases,
} from '@margai/contracts';

/**
 * MargAI Deterministic Risk & Relevance Engine
 * Evaluates edge-ML camera observations against vehicle trajectory, lane boundaries,
 * and IMU shockwave data to eliminate false alarms and prioritize driver safety.
 */

export interface RiskEvaluationResult {
  isRelevant: boolean;
  relevanceReason: string;
  calculatedRisk: RiskLevel;
  ttcSec: number;
  targetLane: 'current_lane' | 'adjacent_lane' | 'roadside';
  recommendedSpeedKmh: number;
  recommendedAction: string;
}

export class RiskEngine {
  /**
   * Calculates Haversine distance in meters between two coordinates.
   */
  public static haversineMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculates forward bearing angle (0-360 degrees) from point 1 to point 2.
   */
  public static calculateBearing(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
    const x =
      Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
      Math.sin((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.cos(((lon2 - lon1) * Math.PI) / 180);
    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
  }

  /**
   * Evaluates an edge-ML observation and determines if an alert should be emitted.
   */
  public evaluate(
    obs: ObservationPayload,
    vehicleGeo?: GeoEstimate
  ): RiskEvaluationResult {
    const currentSpeedMps = Math.max(obs.geo.speedMps || (vehicleGeo ? vehicleGeo.speedMps : 0) || 12.0, 1.0);
    const distanceM = Math.max(obs.distanceM, 2.0);
    const ttcSec = Math.round((distanceM / currentSpeedMps) * 10) / 10;
    const currentSpeedKmh = Math.round(currentSpeedMps * 3.6);

    // 1. Lane Offset Analysis (Standard Indian Highway lane width = ~3.5m)
    const offset = Math.abs(obs.laneOffsetM);
    let targetLane: 'current_lane' | 'adjacent_lane' | 'roadside' = 'current_lane';
    if (offset > 3.0) {
      targetLane = 'roadside';
    } else if (offset > 1.2) {
      targetLane = 'adjacent_lane';
    }

    // 2. Heading Alignment Filter (if vehicle trajectory is available)
    if (vehicleGeo && vehicleGeo.headingDeg !== undefined) {
      const bearing = RiskEngine.calculateBearing(
        vehicleGeo.latitude,
        vehicleGeo.longitude,
        obs.geo.latitude,
        obs.geo.longitude
      );
      const headingDiff = Math.abs(((bearing - vehicleGeo.headingDeg + 180) % 360) - 180);
      // If hazard is behind vehicle or opposite carriageway (>75 deg offset), filter out
      if (headingDiff > 75 && distanceM > 15) {
        return {
          isRelevant: false,
          relevanceReason: 'Opposite carriageway or behind vehicle trajectory',
          calculatedRisk: 'information',
          ttcSec,
          targetLane,
          recommendedSpeedKmh: currentSpeedKmh,
          recommendedAction: 'Maintain lane',
        };
      }
    }

    // 3. Risk Escalation Matrix based on TTC & Hazard Type
    let calculatedRisk: RiskLevel = obs.riskLevel;
    let recommendedSpeedKmh = Math.max(25, currentSpeedKmh - 15);
    let recommendedAction = 'Maintain safe distance and monitor path';

    // Accelerometer Shockwave fusion (Instant bump confirmed by phone Z-axis)
    const zAccel = obs.imu?.zAccelG || 1.0;
    const hasShockwave = obs.imu?.shockwaveDetected || zAccel > 1.8;

    if (hasShockwave && obs.hazardType === 'pothole') {
      calculatedRisk = 'urgent';
      recommendedSpeedKmh = Math.min(30, currentSpeedKmh);
      recommendedAction = 'Severe road surface damage detected! Slow down immediately.';
    } else if (targetLane === 'current_lane') {
      if (ttcSec <= 2.8) {
        calculatedRisk = 'urgent';
        recommendedSpeedKmh = Math.min(30, currentSpeedKmh * 0.5);
        recommendedAction = `Immediate ${obs.hazardType} threat in lane! Brake gently.`;
      } else if (ttcSec <= 5.5) {
        calculatedRisk = 'caution';
        recommendedSpeedKmh = Math.min(45, currentSpeedKmh * 0.75);
        recommendedAction = `${obs.hazardType.toUpperCase()} ahead in your lane. Prepare to slow down.`;
      } else {
        calculatedRisk = 'information';
      }
    } else if (targetLane === 'adjacent_lane') {
      // Animal or pedestrian on adjacent lane might suddenly cut across!
      if (obs.hazardType === 'cattle' || obs.hazardType === 'pedestrian') {
        calculatedRisk = ttcSec <= 3.5 ? 'caution' : 'information';
        recommendedAction = `${obs.hazardType} near road lane boundary. Watch for unexpected crossing.`;
      } else {
        calculatedRisk = 'information';
      }
    } else {
      // Roadside hazard (outside drivable lane) -> low priority
      calculatedRisk = 'information';
      recommendedAction = 'Hazard detected on road shoulder';
    }

    return {
      isRelevant: true,
      relevanceReason: `Hazard active on ${targetLane} with TTC ${ttcSec}s`,
      calculatedRisk,
      ttcSec,
      targetLane,
      recommendedSpeedKmh: Math.round(recommendedSpeedKmh),
      recommendedAction,
    };
  }

  /**
   * Transforms an ObservationPayload into a DriverAlert ready for broadcast to the Tesla MCU
   */
  public generateDriverAlert(
    obs: ObservationPayload,
    evalResult: RiskEvaluationResult
  ): DriverAlert {
    const localized = getStandardLocalizedPhrases(obs.hazardType, evalResult.calculatedRisk);

    return {
      alertId: `alt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      hazardType: obs.hazardType,
      riskLevel: evalResult.calculatedRisk,
      distanceM: obs.distanceM,
      ttcSec: evalResult.ttcSec,
      targetLane: evalResult.targetLane,
      recommendedSpeedKmh: evalResult.recommendedSpeedKmh,
      recommendedAction: evalResult.recommendedAction,
      localizedMessages: localized,
      geo: obs.geo,
      reportedAt: new Date().toISOString(),
      sourceDeviceId: obs.deviceId,
    };
  }
}
