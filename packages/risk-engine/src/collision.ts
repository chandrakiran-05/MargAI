import { RiskLevel } from '@margai/contracts';

export interface ObjectTrack {
  trackId: string;
  class: 'pedestrian' | 'animal' | 'vehicle';
  subclass?: string;          // e.g. 'cow', 'dog'
  confidence: number;
  distanceAheadM: number;     // along vehicle vector
  lateralOffsetM: number;     // cross-track (-left, +right)
  speedMps?: number;
  lateralVelocityMps?: number;// +moving right, -moving left
}

export interface CollisionRiskAssessment {
  trackId: string;
  isThreat: boolean;
  riskLevel: RiskLevel;
  ttcSec: number | null;
  messageKey: string;
  reasonCodes: string[];
}

/**
 * Assesses collision risk with moving or stationary road actors (pedestrians, stray animals, vehicles)
 */
export function assessCollisionRisk(
  egoSpeedMps: number,
  egoWidthM: number = 2.0,
  track: ObjectTrack
): CollisionRiskAssessment {
  const reasonCodes: string[] = [];

  // Filter out objects that are behind or too far
  if (track.distanceAheadM <= 0) {
    return {
      trackId: track.trackId,
      isThreat: false,
      riskLevel: 'information',
      ttcSec: null,
      messageKey: 'none',
      reasonCodes: ['OBJECT_BEHIND_OR_PASSED'],
    };
  }

  // Calculate Time-to-Collision (TTC)
  const effectiveApproachSpeed = Math.max(egoSpeedMps, 0.5);
  const ttcSec = track.distanceAheadM / effectiveApproachSpeed;

  const halfWidthWithBuffer = egoWidthM / 2 + 0.8; // 1.8m buffer around vehicle center

  // Check if object is currently within ego vehicle lateral path
  const isDirectlyInPath = Math.abs(track.lateralOffsetM) <= halfWidthWithBuffer;

  // Check if object is encroaching / crossing towards ego path
  let willCrossPath = false;
  if (track.lateralVelocityMps !== undefined && Math.abs(track.lateralVelocityMps) > 0.2) {
    // If on the left and moving right, or on the right and moving left
    const movingTowardsCenter =
      (track.lateralOffsetM < -halfWidthWithBuffer && track.lateralVelocityMps > 0) ||
      (track.lateralOffsetM > halfWidthWithBuffer && track.lateralVelocityMps < 0);

    if (movingTowardsCenter) {
      // Projected lateral position at arrival
      const projectedOffset = track.lateralOffsetM + track.lateralVelocityMps * ttcSec;
      if (Math.abs(projectedOffset) <= halfWidthWithBuffer + 1.0) {
        willCrossPath = true;
        reasonCodes.push('LATERAL_PATH_ENCROACHMENT');
      }
    }
  }

  // Non-conflicting pedestrian or cattle on shoulder/sidewalk moving away/parallel
  if (!isDirectlyInPath && !willCrossPath) {
    if (Math.abs(track.lateralOffsetM) > 3.5) {
      return {
        trackId: track.trackId,
        isThreat: false,
        riskLevel: 'information',
        ttcSec: Math.round(ttcSec * 10) / 10,
        messageKey: 'none',
        reasonCodes: ['SAFE_LATERAL_CLEARANCE_ON_SHOULDER'],
      };
    }
  }

  // Determine Risk Level based on TTC and path intersection
  let riskLevel: RiskLevel = 'information';
  let isThreat = false;
  const isAnimal = track.class === 'animal';
  const prefix = isAnimal ? 'hazard.animal' : 'hazard.pedestrian';

  if (isDirectlyInPath || willCrossPath) {
    isThreat = true;
    if (ttcSec <= 3.2 || track.distanceAheadM < 25) {
      riskLevel = 'urgent';
      reasonCodes.push('CRITICAL_TTC_IMMINENT_COLLISION');
    } else if (ttcSec <= 6.0 || track.distanceAheadM < 60) {
      riskLevel = 'caution';
      reasonCodes.push('MODERATE_TTC_PATH_CONFLICT');
    } else {
      riskLevel = 'information';
      reasonCodes.push('PATH_CONFLICT_AHEAD_OBSERVATION');
    }
  } else {
    // Near path margin
    if (Math.abs(track.lateralOffsetM) <= 3.0 && ttcSec <= 4.0) {
      riskLevel = 'caution';
      isThreat = true;
      reasonCodes.push('PROXIMITY_ALERT_NEAR_ROADWAY');
    }
  }

  const messageKey =
    riskLevel === 'urgent'
      ? `${prefix}.path_conflict`
      : riskLevel === 'caution'
      ? `${prefix}.ahead_caution`
      : `${prefix}.detected`;

  return {
    trackId: track.trackId,
    isThreat,
    riskLevel,
    ttcSec: Math.round(ttcSec * 10) / 10,
    messageKey,
    reasonCodes,
  };
}
