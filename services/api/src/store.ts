import {
  Hazard,
  Observation,
  CivicCase,
  VerificationState,
} from '@margai/contracts';
import { haversineDistanceM } from '@margai/risk-engine';
import { v4 as uuidv4 } from 'uuid';

export interface LatencyMetricRecord {
  timestamp: string;
  stage: 'capture_to_detection' | 'detection_to_alert' | 'server_relay';
  durationMs: number;
}

export class MargAIStorageEngine {
  private hazards: Map<string, Hazard> = new Map();
  private observations: Map<string, Observation> = new Map();
  private cases: Map<string, CivicCase> = new Map();
  private latencyMetrics: LatencyMetricRecord[] = [];
  public isFirestoreLive: boolean = false;

  constructor() {
    this.seedInitialCorridorData();
  }

  private seedInitialCorridorData() {
    // 1. Kadubeesanahalli Underpass Pothole
    const potholeHazard: Hazard = {
      id: 'h_pothole_kadubeesanahalli',
      type: 'pothole',
      revision: 2,
      location: {
        latitude: 12.9372,
        longitude: 77.6953,
        horizontalAccuracyM: 1.5,
        provenance: 'measured',
      },
      roadReference: {
        corridorId: 'blr_outer_ring_road',
        edgeId: 'orr_south_kadubeesanahalli_main',
        roadName: 'Outer Ring Road (Kadubeesanahalli Underpass Southbound)',
        carriageway: 'forward',
        speedLimitKmh: 60,
      },
      directionApplicability: 'same_direction',
      confidence: 0.94,
      verificationState: 'corroborated',
      firstSeen: new Date(Date.now() - 3600000 * 4).toISOString(),
      lastSeen: new Date(Date.now() - 60000).toISOString(),
      expiry: new Date(Date.now() + 86400000 * 3).toISOString(),
      evidenceCount: 4,
      corroboratingSourcesCount: 3,
      evidenceIds: ['ev_kad_1', 'ev_kad_2', 'ev_kad_3'],
      metadata: {
        severityScore: 8.4,
        depthEstimateCm: 7.5,
        accelerometerPeakG: 2.1,
      },
    };
    this.hazards.set(potholeHazard.id, potholeHazard);

    // Initial Civic Case for BBMP
    const civicCase: CivicCase = {
      id: 'case_bbmp_kadubeesanahalli_01',
      hazardId: potholeHazard.id,
      jurisdiction: 'Bruhat Bengaluru Mahanagara Palike (BBMP) - Mahadevapura Ward 85',
      status: 'corroborated',
      roadName: potholeHazard.roadReference.roadName,
      location: potholeHazard.location,
      hazardType: 'pothole',
      severityScore: 8.4,
      evidenceCount: 4,
      evidenceUrls: [
        'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
      ],
      firstObservedAt: potholeHazard.firstSeen,
      lastObservedAt: potholeHazard.lastSeen,
      authority: {
        name: 'Bruhat Bengaluru Mahanagara Palike (BBMP)',
        portalId: 'BBMP-Sahaaya-Roads',
      },
      auditTrail: [
        {
          timestamp: potholeHazard.firstSeen,
          action: 'AUTOMATIC_CORROBORATION',
          actor: 'MargAI Cloud Clustering Engine',
          notes: 'Corroborated across 3 independent vehicles.',
        },
      ],
    };
    this.cases.set(civicCase.id, civicCase);

    // 2. Bellandur Lake Road Stray Cattle Crossing Hotspot
    const cattleHazard: Hazard = {
      id: 'h_cattle_bellandur',
      type: 'animal',
      revision: 1,
      location: {
        latitude: 12.9275,
        longitude: 77.6842,
        horizontalAccuracyM: 2.0,
        provenance: 'measured',
      },
      roadReference: {
        corridorId: 'blr_outer_ring_road',
        edgeId: 'orr_south_bellandur_main',
        roadName: 'Outer Ring Road (Near Bellandur EcoSpace Main Gate)',
        carriageway: 'forward',
        speedLimitKmh: 60,
      },
      directionApplicability: 'both_directions',
      confidence: 0.91,
      verificationState: 'unverified',
      firstSeen: new Date(Date.now() - 300000).toISOString(),
      lastSeen: new Date().toISOString(),
      expiry: new Date(Date.now() + 600000).toISOString(), // Moving animal expires in 10 mins
      evidenceCount: 1,
      corroboratingSourcesCount: 1,
      evidenceIds: ['ev_cattle_1'],
      metadata: { animalClass: 'cow', movementSpeedMps: 1.1 },
    };
    this.hazards.set(cattleHazard.id, cattleHazard);
  }

  public getHazards(filter?: { corridorId?: string; activeOnly?: boolean }): Hazard[] {
    const now = new Date().toISOString();
    return Array.from(this.hazards.values()).filter((h) => {
      if (filter?.corridorId && h.roadReference.corridorId !== filter.corridorId) {
        return false;
      }
      if (filter?.activeOnly !== false && h.expiry < now) {
        return false;
      }
      return true;
    });
  }

  public getHazardById(id: string): Hazard | undefined {
    return this.hazards.get(id);
  }

  public getCases(): CivicCase[] {
    return Array.from(this.cases.values());
  }

  public getCaseById(id: string): CivicCase | undefined {
    return this.cases.get(id);
  }

  public updateCase(id: string, updater: (c: CivicCase) => CivicCase): CivicCase | null {
    const current = this.cases.get(id);
    if (!current) return null;
    const updated = updater(current);
    this.cases.set(id, updated);
    return updated;
  }

  /**
   * Spatial clustering and observation ingestion
   */
  public ingestObservation(obs: Observation): { hazard: Hazard; isNew: boolean; caseUpdated?: CivicCase } {
    this.observations.set(obs.id, obs);

    const obsLoc = obs.estimatedHazardLocation || {
      latitude: obs.vehiclePose.latitude,
      longitude: obs.vehiclePose.longitude,
      horizontalAccuracyM: obs.vehiclePose.horizontalAccuracyM,
      provenance: 'estimated',
    };

    // Find nearest matching hazard within 20 meters
    let matchedHazard: Hazard | null = null;
    for (const h of this.hazards.values()) {
      const dist = haversineDistanceM(obsLoc, h.location);
      if (dist <= 20) {
        matchedHazard = h;
        break;
      }
    }

    if (matchedHazard) {
      // Cluster with existing hazard
      matchedHazard.revision += 1;
      matchedHazard.lastSeen = obs.captureTime;
      matchedHazard.evidenceCount += 1;
      if (obs.evidenceRef) {
        matchedHazard.evidenceIds.push(obs.evidenceRef);
      }

      // Check independent corroboration
      const isIndependent = !matchedHazard.evidenceIds.includes(obs.sourceId);
      if (isIndependent) {
        matchedHazard.corroboratingSourcesCount += 1;
        if (matchedHazard.corroboratingSourcesCount >= 2 && matchedHazard.verificationState === 'unverified') {
          matchedHazard.verificationState = 'corroborated';
        }
      }

      this.hazards.set(matchedHazard.id, matchedHazard);

      // Update associated civic case if exists
      let updatedCase: CivicCase | undefined;
      for (const [caseId, c] of this.cases.entries()) {
        if (c.hazardId === matchedHazard.id) {
          c.evidenceCount = matchedHazard.evidenceCount;
          c.status = matchedHazard.verificationState === 'corroborated' ? 'corroborated' : c.status;
          c.lastObservedAt = obs.captureTime;
          c.auditTrail.push({
            timestamp: new Date().toISOString(),
            action: 'CORROBORATING_OBSERVATION',
            actor: `Vehicle ${obs.sourceId}`,
            notes: `Observation ${obs.id} logged with confidence ${obs.perceptionOutput[0]?.confidence || 0.9}`,
          });
          this.cases.set(caseId, c);
          updatedCase = c;
          break;
        }
      }

      return { hazard: matchedHazard, isNew: false, caseUpdated: updatedCase };
    }

    // Create new hazard from observation
    const primaryClass = obs.perceptionOutput[0]?.class || 'pothole';
    const hazardType = primaryClass.includes('animal')
      ? 'animal'
      : primaryClass.includes('pedestrian')
      ? 'pedestrian'
      : 'pothole';

    const newHazard: Hazard = {
      id: `h_${uuidv4().slice(0, 8)}`,
      type: hazardType,
      revision: 1,
      location: {
        latitude: obsLoc.latitude,
        longitude: obsLoc.longitude,
        horizontalAccuracyM: obsLoc.horizontalAccuracyM,
        provenance: 'measured',
      },
      roadReference: {
        corridorId: 'blr_outer_ring_road',
        edgeId: 'orr_south_bellandur_main',
        roadName: 'Bengaluru Outer Ring Road Corridor',
        carriageway: 'forward',
      },
      directionApplicability: 'same_direction',
      confidence: obs.perceptionOutput[0]?.confidence || 0.88,
      verificationState: 'unverified',
      firstSeen: obs.captureTime,
      lastSeen: obs.captureTime,
      expiry: new Date(Date.now() + (hazardType === 'animal' ? 600000 : 86400000 * 3)).toISOString(),
      evidenceCount: 1,
      corroboratingSourcesCount: 1,
      evidenceIds: obs.evidenceRef ? [obs.evidenceRef] : [],
      metadata: {
        peakG: obs.accelerometerPeakG || 1.8,
      },
    };

    this.hazards.set(newHazard.id, newHazard);

    // Create new civic case
    const newCase: CivicCase = {
      id: `case_${uuidv4().slice(0, 8)}`,
      hazardId: newHazard.id,
      jurisdiction: 'Bruhat Bengaluru Mahanagara Palike (BBMP) - Mahadevapura Ward 85',
      status: 'detected',
      roadName: newHazard.roadReference.roadName,
      location: newHazard.location,
      hazardType: newHazard.type,
      severityScore: 7.8,
      evidenceCount: 1,
      evidenceUrls: [
        obs.evidenceRef ||
          'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
      ],
      firstObservedAt: newHazard.firstSeen,
      lastObservedAt: newHazard.lastSeen,
      authority: {
        name: 'Bruhat Bengaluru Mahanagara Palike (BBMP)',
        portalId: 'BBMP-Sahaaya-Roads',
      },
      auditTrail: [
        {
          timestamp: new Date().toISOString(),
          action: 'CASE_DETECTED',
          actor: `Vehicle ${obs.sourceId}`,
          notes: 'Initial observation received and queued for peer corroboration.',
        },
      ],
    };

    this.cases.set(newCase.id, newCase);

    return { hazard: newHazard, isNew: true, caseUpdated: newCase };
  }

  public recordLatency(stage: LatencyMetricRecord['stage'], durationMs: number) {
    this.latencyMetrics.push({
      timestamp: new Date().toISOString(),
      stage,
      durationMs,
    });
    if (this.latencyMetrics.length > 500) {
      this.latencyMetrics.shift();
    }
  }

  public getLatencyMetrics() {
    const stages = ['capture_to_detection', 'detection_to_alert', 'server_relay'] as const;
    const stats: Record<string, { count: number; p50Ms: number; p95Ms: number; avgMs: number }> = {};

    for (const stage of stages) {
      const records = this.latencyMetrics.filter((m) => m.stage === stage).map((m) => m.durationMs);
      if (records.length === 0) {
        stats[stage] = { count: 0, p50Ms: 0, p95Ms: 0, avgMs: 0 };
        continue;
      }
      records.sort((a, b) => a - b);
      const p50 = records[Math.floor(records.length * 0.5)];
      const p95 = records[Math.floor(records.length * 0.95)];
      const avg = records.reduce((acc, v) => acc + v, 0) / records.length;
      stats[stage] = {
        count: records.length,
        p50Ms: Math.round(p50 * 10) / 10,
        p95Ms: Math.round(p95 * 10) / 10,
        avgMs: Math.round(avg * 10) / 10,
      };
    }

    return stats;
  }
}

export const storageEngine = new MargAIStorageEngine();
