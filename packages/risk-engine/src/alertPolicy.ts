import {
  Hazard,
  VehiclePose,
  DriverAlert,
  RiskLevel,
} from '@margai/contracts';
import { relativeDecomposition } from './geo';

export interface RouteMatchContext {
  currentCorridorId: string;
  currentEdgeId: string;
  upcomingEdgeIds: string[];
  isDividedHighway?: boolean;
}

export interface AlertEvaluationOptions {
  alertCooldownSec?: number;
  maxLookaheadDistanceM?: number;
  urbanMode?: boolean;
}

/**
 * Deterministic Alert Policy Engine
 * Evaluates whether an active Hazard requires an in-cabin alert for this driver.
 */
export function evaluateHazardForDriver(
  hazard: Hazard,
  vehiclePose: VehiclePose,
  routeContext: RouteMatchContext,
  options: AlertEvaluationOptions = {}
): DriverAlert | null {
  const {
    maxLookaheadDistanceM = 400,
  } = options;

  const reasonCodes: string[] = [];

  // 1. Corridor & Edge Compatibility Check
  const isSameCorridor = hazard.roadReference.corridorId === routeContext.currentCorridorId;
  const isCurrentEdge = hazard.roadReference.edgeId === routeContext.currentEdgeId;
  const isUpcomingEdge = routeContext.upcomingEdgeIds.includes(hazard.roadReference.edgeId);

  if (!isSameCorridor && !isCurrentEdge && !isUpcomingEdge) {
    // If not matching corridor/edge, reject (e.g., parallel service road vs flyover)
    return null;
  }

  // 2. Carriageway / Direction Applicability Check
  // If road is divided and hazard only applies to opposite direction, suppress
  if (hazard.roadReference.carriageway === 'reverse' && hazard.directionApplicability === 'same_direction') {
    reasonCodes.push('OPPOSITE_CARRIAGEWAY_SUPPRESSED');
    return null;
  }

  // 3. Relative Spatial Decomposition
  const decomp = relativeDecomposition(
    {
      latitude: vehiclePose.latitude,
      longitude: vehiclePose.longitude,
      headingDeg: vehiclePose.headingDeg,
    },
    {
      latitude: hazard.location.latitude,
      longitude: hazard.location.longitude,
    }
  );

  // 4. Pass-by removal with GPS jitter tolerance (-8 meters)
  if (decomp.distanceAheadM < -8) {
    reasonCodes.push('HAZARD_PASSED');
    return {
      id: `alert_${hazard.id}_passed`,
      hazardId: hazard.id,
      hazardRevision: hazard.revision,
      relevanceResult: false,
      riskLevel: 'information',
      distanceAheadM: Math.round(decomp.distanceAheadM),
      timeAheadSec: null,
      messageKey: 'hazard.cleared',
      expiry: new Date(Date.now() + 5000).toISOString(),
      reasonCodes,
    };
  }

  // 5. Lookahead distance boundary
  if (decomp.distanceAheadM > maxLookaheadDistanceM) {
    reasonCodes.push('BEYOND_LOOKAHEAD_HORIZON');
    return null;
  }

  // Calculate Time-to-Hazard
  const effectiveSpeed = Math.max(vehiclePose.speedMps, 1.0);
  const timeAheadSec = Math.round((decomp.distanceAheadM / effectiveSpeed) * 10) / 10;

  // 6. Risk Level Assignment
  let riskLevel: RiskLevel = 'information';
  let messageKey = `hazard.${hazard.type}.detected`;

  if (hazard.type === 'pothole') {
    if (decomp.distanceAheadM <= 35 && effectiveSpeed > 7) {
      riskLevel = 'urgent';
      messageKey = 'hazard.pothole.ahead';
      reasonCodes.push('IMMEDIATE_POTHOLE_IMPACT_RISK');
    } else if (decomp.distanceAheadM <= 90) {
      riskLevel = 'caution';
      messageKey = 'hazard.pothole.ahead';
      reasonCodes.push('APPROACHING_POTHOLE');
    } else {
      riskLevel = 'information';
      messageKey = 'hazard.pothole.detected';
      reasonCodes.push('UPCOMING_ROAD_DEFECT');
    }
  } else if (hazard.type === 'suspected_incident' || hazard.type === 'confirmed_incident') {
    if (decomp.distanceAheadM <= 150) {
      riskLevel = 'urgent';
      messageKey =
        hazard.type === 'confirmed_incident'
          ? 'hazard.incident.ahead_confirmed'
          : 'hazard.incident.ahead_unverified';
      reasonCodes.push('INCIDENT_BLOCKAGE_RISK');
    } else {
      riskLevel = 'caution';
      messageKey = 'hazard.incident.ahead_unverified';
      reasonCodes.push('UPCOMING_CONGESTION_INCIDENT');
    }
  } else if (hazard.type === 'low_visibility') {
    riskLevel = 'caution';
    messageKey = 'visibility.low';
    reasonCodes.push('FOG_DENSE_HAZE_CORRIDOR');
  } else {
    // Other hazards
    riskLevel = decomp.distanceAheadM <= 50 ? 'caution' : 'information';
  }

  const expiry = new Date(Date.now() + 15000).toISOString();

  return {
    id: `alert_${hazard.id}_rev${hazard.revision}`,
    hazardId: hazard.id,
    hazardRevision: hazard.revision,
    relevanceResult: true,
    riskLevel,
    distanceAheadM: Math.round(decomp.distanceAheadM),
    timeAheadSec,
    messageKey,
    expiry,
    reasonCodes,
  };
}
