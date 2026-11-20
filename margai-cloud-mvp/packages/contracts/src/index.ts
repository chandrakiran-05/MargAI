import { z } from 'zod';

/**
 * MargAI Safety Contracts - Google Startup Buildathon India 2026
 * Canonical type definitions and Zod schemas for Edge-to-Cockpit vehicle telemetry.
 */

export const HazardTypeSchema = z.enum([
  'pothole',
  'cattle',
  'pedestrian',
  'accident',
  'debris',
  'sharp_curve',
  'speed_breaker',
]);
export type HazardType = z.infer<typeof HazardTypeSchema>;

export const RiskLevelSchema = z.enum(['information', 'caution', 'urgent']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const GeoEstimateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  headingDeg: z.number().min(0).max(360).optional(),
  speedMps: z.number().min(0).optional(),
  accuracyM: z.number().min(0).optional(),
  timestampMs: z.number().optional(),
});
export type GeoEstimate = z.infer<typeof GeoEstimateSchema>;

export const IMUTelemetrySchema = z.object({
  zAccelG: z.number().default(1.0),
  lateralAccelG: z.number().optional().default(0.0),
  pitchDeg: z.number().optional().default(0.0),
  rollDeg: z.number().optional().default(0.0),
  shockwaveDetected: z.boolean().optional().default(false),
});
export type IMUTelemetry = z.infer<typeof IMUTelemetrySchema>;

export const ObservationPayloadSchema = z.object({
  observationId: z.string(),
  deviceId: z.string(),
  corridorId: z.string().default('in_blr_outer_ring_road'),
  hazardType: HazardTypeSchema,
  confidence: z.number().min(0).max(1),
  riskLevel: RiskLevelSchema,
  distanceM: z.number().min(0),
  laneOffsetM: z.number().default(0.0), // 0: current lane, -1.8: left shoulder, +1.8: right shoulder
  geo: GeoEstimateSchema,
  imu: IMUTelemetrySchema.optional(),
  evidenceSnapshotBase64: z.string().optional(),
  timestamp: z.string().default(() => new Date().toISOString()),
});
export type ObservationPayload = z.infer<typeof ObservationPayloadSchema>;

export const LocalizedMessagesSchema = z.object({
  en: z.string(),
  hi: z.string(),
  ta: z.string(),
  te: z.string(),
  kn: z.string(),
});
export type LocalizedMessages = z.infer<typeof LocalizedMessagesSchema>;

export const DriverAlertSchema = z.object({
  alertId: z.string(),
  hazardType: HazardTypeSchema,
  riskLevel: RiskLevelSchema,
  distanceM: z.number(),
  ttcSec: z.number(),
  targetLane: z.enum(['current_lane', 'adjacent_lane', 'roadside']),
  recommendedSpeedKmh: z.number(),
  recommendedAction: z.string(),
  localizedMessages: LocalizedMessagesSchema,
  geo: GeoEstimateSchema,
  reportedAt: z.string(),
  sourceDeviceId: z.string().optional(),
});
export type DriverAlert = z.infer<typeof DriverAlertSchema>;

export const EventEnvelopeSchema = z.object({
  eventId: z.string(),
  timestamp: z.string(),
  sourceDeviceId: z.string(),
  topic: z.enum([
    'observation.created',
    'hazard.escalated',
    'hazard.cleared',
    'telemetry.heartbeat',
    'alert.broadcast',
  ]),
  payload: z.unknown(),
});
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

/**
 * Standardized 5-language localized hazard phrase generator
 */
export function getStandardLocalizedPhrases(
  hazardType: HazardType,
  riskLevel: RiskLevel
): LocalizedMessages {
  switch (hazardType) {
    case 'pothole':
      return {
        en: riskLevel === 'urgent' ? 'Deep pothole ahead! Slow down immediately.' : 'Pothole ahead in lane.',
        hi: 'आगे सड़क पर गड्ढा है। गति धीमी करें।',
        ta: 'முன்னே சாலையில் குழி உள்ளது. வேகத்தைக் குறையுங்கள்.',
        te: 'ముందు గుంత ఉంది. వేగం తగ్గించండి.',
        kn: 'ಮುಂದೆ ರಸ್ತೆಯಲ್ಲಿ ಗುಂಡಿ ಇದೆ. ವೇಗ ಕಡಿಮೆ ಮಾಡಿ.',
      };
    case 'cattle':
      return {
        en: 'Stray cattle crossing ahead. Brake gently.',
        hi: 'आगे सड़क पर मवेशी हैं। सावधानी से ब्रेक लगाएं।',
        ta: 'முன்னே கால்நடைகள் சாலையைக் கடக்கின்றன. கவனம்.',
        te: 'ముందు పశువులు రోడ్డు దాటుతున్నాయి. నెమ్మదిగా వెళ్లండి.',
        kn: 'ಮುಂದೆ ದನ-ಕರುಗಳು ರಸ್ತೆ ದಾಟುತ್ತಿವೆ. ಎಚ್ಚರಿಕೆಯಿಂದ ಚಲಿಸಿ.',
      };
    case 'pedestrian':
      return {
        en: 'Pedestrian on road ahead. Caution.',
        hi: 'आगे पैदल यात्री सड़क पर हैं। सावधान रहें।',
        ta: 'முன்னே பாதசாரி நடக்கிறார். கவனம்.',
        te: 'ముందు పాదచారులు ఉన్నారు. జాగ్రత్త.',
        kn: 'ಮುಂದೆ ಪಾದಚಾರಿಗಳು ರಸ್ತೆಯಲ್ಲಿದ್ದಾರೆ. ಎಚ್ಚರ.',
      };
    case 'sharp_curve':
      return {
        en: 'Sharp curve ahead. Reduce speed to safe limit.',
        hi: 'आगे तीखा मोड़ है। गति कम करें।',
        ta: 'முன்னே கூர்மையான வளைவு உள்ளது. வேகம் குறைக்கவும்.',
        te: 'ముందు పదునైన మలుపు ఉంది. వేగం తగ్గించండి.',
        kn: 'ಮುಂದೆ ತೀಕ್ಷ್ಣ ತಿರುವು ಇದೆ. ನಿಧಾನವಾಗಿ ಚಲಿಸಿ.',
      };
    case 'accident':
      return {
        en: 'Accident scene ahead! Proceed with caution.',
        hi: 'आगे दुर्घटना स्थल है! सावधानी से आगे बढ़ें।',
        ta: 'முன்னே விபத்து பகுதி உள்ளது! எச்சரிக்கையாக செல்லவும்.',
        te: 'ముందు ప్రమాదం జరిగింది! జాగ్రత్తగా వెళ్లండి.',
        kn: 'ಮುಂದೆ ಅಪಘಾತ ಸಂಭವಿಸಿದೆ! ಎಚ್ಚರಿಕೆಯಿಂದ ಮುಂದುವರಿಯಿರಿ.',
      };
    default:
      return {
        en: 'Road hazard reported ahead. Stay alert.',
        hi: 'आगे सड़क पर रुकावट है। सतर्क रहें।',
        ta: 'முன்னே சாலை ஆபத்து உள்ளது. விழிப்புடன் இருக்கவும்.',
        te: 'ముందు రహదారి ప్రమాదం ఉంది. అప్రమత్తంగా ఉండండి.',
        kn: 'ಮುಂದೆ ರಸ್ತೆ ಅಪಾಯವಿದೆ. ಜಾಗರೂಕರಾಗಿರಿ.',
      };
  }
}
