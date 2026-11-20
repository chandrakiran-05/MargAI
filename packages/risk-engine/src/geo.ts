/**
 * Geospatial mathematics for corridor matching, bearings, along-track distance
 */

const EARTH_RADIUS_METERS = 6371000;

export interface LatLng {
  latitude: number;
  longitude: number;
}

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculates geodesic distance between two points using Haversine formula
 */
export function haversineDistanceM(p1: LatLng, p2: LatLng): number {
  const dLat = toRadians(p2.latitude - p1.latitude);
  const dLng = toRadians(p2.longitude - p1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(p1.latitude)) *
      Math.cos(toRadians(p2.latitude)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculates initial forward azimuth / bearing in degrees (0 - 360) from p1 to p2
 */
export function calculateBearingDeg(p1: LatLng, p2: LatLng): number {
  const lat1 = toRadians(p1.latitude);
  const lat2 = toRadians(p2.latitude);
  const dLng = toRadians(p2.longitude - p1.longitude);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const brng = toDegrees(Math.atan2(y, x));
  return (brng + 360) % 360;
}

/**
 * Calculates the smallest angular difference (-180 to +180) between two headings
 */
export function angularDifferenceDeg(heading1: number, heading2: number): number {
  const diff = ((heading2 - heading1 + 180) % 360) - 180;
  return diff < -180 ? diff + 360 : diff;
}

/**
 * Decomposes a target position relative to vehicle pose into:
 * - distanceAheadM: along-track distance (+ forward, - behind)
 * - lateralOffsetM: cross-track distance (+ right, - left)
 */
export function relativeDecomposition(
  vehiclePose: LatLng & { headingDeg: number },
  target: LatLng
): { distanceAheadM: number; lateralOffsetM: number; straightLineDistM: number; relativeAngleDeg: number } {
  const straightLineDistM = haversineDistanceM(vehiclePose, target);
  if (straightLineDistM < 0.1) {
    return { distanceAheadM: 0, lateralOffsetM: 0, straightLineDistM: 0, relativeAngleDeg: 0 };
  }

  const bearingToTarget = calculateBearingDeg(vehiclePose, target);
  const relativeAngleDeg = angularDifferenceDeg(vehiclePose.headingDeg, bearingToTarget);
  const relRad = toRadians(relativeAngleDeg);

  const distanceAheadM = straightLineDistM * Math.cos(relRad);
  const lateralOffsetM = straightLineDistM * Math.sin(relRad);

  return {
    distanceAheadM,
    lateralOffsetM,
    straightLineDistM,
    relativeAngleDeg,
  };
}
