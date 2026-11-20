import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';
import { ObservationPayload, DriverAlert } from '@margai/contracts';

/**
 * MargAI Cloud Persistence Adapter
 * Provides sub-millisecond in-memory cache for ultra-low-latency vehicle broadcast,
 * with asynchronous background persistence to Google Cloud Firestore & Cloud Storage.
 */

export class MargAIStore {
  private inMemoryObservations: ObservationPayload[] = [];
  private inMemoryAlerts: DriverAlert[] = [];
  private firestore: Firestore | null = null;
  private storage: Storage | null = null;
  private evidenceBucketName: string | null = null;
  private isGcpConfigured: boolean = false;

  constructor() {
    this.initGcpClients();
  }

  private initGcpClients() {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
    this.evidenceBucketName = process.env.GCS_EVIDENCE_BUCKET || null;

    if (projectId) {
      try {
        this.firestore = new Firestore({ projectId });
        this.storage = new Storage({ projectId });
        this.isGcpConfigured = true;
        console.log(`[Store] Initialized Google Cloud Firestore & Storage for project: ${projectId}`);
      } catch (err: any) {
        console.warn(`[Store] Running in In-Memory mode (GCP init note: ${err.message})`);
      }
    } else {
      console.log('[Store] Running with fast In-Memory storage (Set GOOGLE_CLOUD_PROJECT for Cloud Run Firestore)');
    }
  }

  /**
   * Save an observation to in-memory ring buffer and async Firestore
   */
  public async saveObservation(obs: ObservationPayload): Promise<void> {
    // 1. In-memory fast ring-buffer (stores latest 5000 items)
    this.inMemoryObservations.unshift(obs);
    if (this.inMemoryObservations.length > 5000) {
      this.inMemoryObservations.pop();
    }

    // 2. Async Cloud Storage upload for evidence snapshot if base64 provided
    if (this.storage && this.evidenceBucketName && obs.evidenceSnapshotBase64) {
      this.uploadEvidenceSnapshot(obs.observationId, obs.evidenceSnapshotBase64).catch((err) => {
        console.error('[Store] Cloud Storage snapshot upload failed:', err.message);
      });
    }

    // 3. Async Firestore write
    if (this.firestore) {
      try {
        const docRef = this.firestore.collection('observations').doc(obs.observationId);
        // Omit giant base64 string from Firestore document, store reference instead
        const { evidenceSnapshotBase64, ...docData } = obs;
        await docRef.set({
          ...docData,
          hasSnapshot: !!evidenceSnapshotBase64,
          createdAt: new Date(),
        });
      } catch (err: any) {
        console.warn('[Store] Firestore write error:', err.message);
      }
    }
  }

  /**
   * Save an alert to in-memory store and Firestore
   */
  public async saveAlert(alert: DriverAlert): Promise<void> {
    this.inMemoryAlerts.unshift(alert);
    if (this.inMemoryAlerts.length > 1000) {
      this.inMemoryAlerts.pop();
    }

    if (this.firestore) {
      try {
        await this.firestore.collection('alerts').doc(alert.alertId).set({
          ...alert,
          createdAt: new Date(),
        });
      } catch (err: any) {
        console.warn('[Store] Firestore alert write error:', err.message);
      }
    }
  }

  /**
   * Query hazards within a radius in meters around given coordinates
   */
  public queryNearbyHazards(
    lat: number,
    lng: number,
    radiusMeters: number = 5000
  ): ObservationPayload[] {
    // Haversine filter on cached observations
    return this.inMemoryObservations.filter((obs) => {
      const dLat = ((obs.geo.latitude - lat) * Math.PI) / 180;
      const dLon = ((obs.geo.longitude - lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat * Math.PI) / 180) *
          Math.cos((obs.geo.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const dist = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return dist <= radiusMeters;
    });
  }

  /**
   * Retrieve recent alerts
   */
  public getRecentAlerts(limit: number = 20): DriverAlert[] {
    return this.inMemoryAlerts.slice(0, limit);
  }

  /**
   * Background upload of JPEG evidence to Google Cloud Storage
   */
  private async uploadEvidenceSnapshot(
    obsId: string,
    b64Payload: string
  ): Promise<string> {
    if (!this.storage || !this.evidenceBucketName) return '';
    const cleanB64 = b64Payload.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanB64, 'base64');
    const bucket = this.storage.bucket(this.evidenceBucketName);
    const file = bucket.file(`evidence/${obsId}.jpg`);
    await file.save(buffer, {
      contentType: 'image/jpeg',
      metadata: { cacheControl: 'public, max-age=86400' },
    });
    return `gs://${this.evidenceBucketName}/evidence/${obsId}.jpg`;
  }
}
