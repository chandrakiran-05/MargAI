import { LatLng, haversineDistanceM, calculateBearingDeg, angularDifferenceDeg } from './geo';

export interface CurveAnalysisResult {
  hasSharpCurve: boolean;
  curveRadiusM: number;
  curveIndex: number;
  distanceToCurveStartM: number;
  previewTimeSec: number | null;
  turnDirection: 'left' | 'right';
  advisorySpeedKmh: number;
  reason: string;
}

/**
 * Calculates circumradius of 3 points on earth surface (Menger curvature approximation)
 */
export function calculateCurveRadiusM(p1: LatLng, p2: LatLng, p3: LatLng): number {
  const a = haversineDistanceM(p2, p3);
  const b = haversineDistanceM(p1, p3);
  const c = haversineDistanceM(p1, p2);

  if (a < 1 || b < 1 || c < 1) return Infinity;

  const s = (a + b + c) / 2;
  const areaSq = s * (s - a) * (s - b) * (s - c);
  if (areaSq <= 0) return Infinity;

  const area = Math.sqrt(areaSq);
  const radius = (a * b * c) / (4 * area);
  return radius;
}

/**
 * Analyzes upcoming route points and warns if a curve exceeds curvature thresholds
 */
export function analyzeRouteSharpCurves(
  vehiclePose: LatLng & { headingDeg: number; speedMps: number },
  routePolyline: LatLng[],
  options: {
    sharpRadiusThresholdM?: number; // default 80m
    maxLookaheadDistanceM?: number; // default 400m
    minPreviewTimeSec?: number;     // default 3.0s
  } = {}
): CurveAnalysisResult | null {
  const {
    sharpRadiusThresholdM = 80,
    maxLookaheadDistanceM = 400,
  } = options;

  if (routePolyline.length < 3) return null;

  let accumulatedDistM = 0;

  for (let i = 0; i < routePolyline.length - 2; i++) {
    const p1 = routePolyline[i];
    const p2 = routePolyline[i + 1];
    const p3 = routePolyline[i + 2];

    const segmentDist = haversineDistanceM(p1, p2);
    accumulatedDistM += segmentDist;

    if (accumulatedDistM > maxLookaheadDistanceM) {
      break;
    }

    const radius = calculateCurveRadiusM(p1, p2, p3);

    if (radius > 5 && radius <= sharpRadiusThresholdM) {
      const b1 = calculateBearingDeg(p1, p2);
      const b2 = calculateBearingDeg(p2, p3);
      const diff = angularDifferenceDeg(b1, b2);
      const turnDirection: 'left' | 'right' = diff < 0 ? 'left' : 'right';

      // Advisory speed formula based on lateral acceleration comfort (IRC standard: a_lat <= 2.5 m/s^2)
      // v = sqrt(a * R)
      const safeSpeedMps = Math.sqrt(2.5 * radius);
      const advisorySpeedKmh = Math.round(safeSpeedMps * 3.6);

      const speedMps = Math.max(vehiclePose.speedMps, 5); // Avoid div by zero
      const previewTimeSec = Math.round((accumulatedDistM / speedMps) * 10) / 10;

      return {
        hasSharpCurve: true,
        curveRadiusM: Math.round(radius),
        curveIndex: i + 1,
        distanceToCurveStartM: Math.round(accumulatedDistM),
        previewTimeSec,
        turnDirection,
        advisorySpeedKmh,
        reason: `Upcoming sharp ${turnDirection} curve (radius ~${Math.round(radius)}m) in ${Math.round(accumulatedDistM)}m. Advisory speed: ${advisorySpeedKmh} km/h`,
      };
    }
  }

  return null;
}
