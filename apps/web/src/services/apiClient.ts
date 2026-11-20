import {
  Hazard,
  Observation,
  CivicCase,
  EventEnvelope,
  SubscriptionScope,
  DriverAlert,
} from '@margai/contracts';

const API_BASE = '/v1';

export class MargAIClient {
  private ws: WebSocket | null = null;
  private onHazardCallback?: (hazard: Hazard, alert?: DriverAlert) => void;
  private onAckCallback?: (data: any) => void;
  private reconnectTimer: any = null;

  public async getHealth(): Promise<any> {
    const res = await fetch('/health');
    return res.json();
  }

  public async getBuildathonMeta(): Promise<any> {
    const res = await fetch(`${API_BASE}/buildathon-meta`);
    return res.json();
  }

  public async getHazards(corridorId?: string): Promise<Hazard[]> {
    const url = corridorId
      ? `${API_BASE}/hazards?corridorId=${encodeURIComponent(corridorId)}`
      : `${API_BASE}/hazards`;
    const res = await fetch(url);
    return res.json();
  }

  public async getCases(): Promise<CivicCase[]> {
    const res = await fetch(`${API_BASE}/cases`);
    return res.json();
  }

  public async generateGeminiReport(caseId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/cases/${caseId}/gemini-report`, {
      method: 'POST',
    });
    return res.json();
  }

  public async submitToAuthority(caseId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/cases/${caseId}/submission-attempts`, {
      method: 'POST',
    });
    return res.json();
  }

  public async postObservation(obs: Observation): Promise<any> {
    const res = await fetch(`${API_BASE}/observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obs),
    });
    return res.json();
  }

  public async getMetrics(): Promise<any> {
    const res = await fetch(`${API_BASE}/metrics`);
    return res.json();
  }

  public async getMLMetrics(): Promise<any> {
    const res = await fetch(`${API_BASE}/ml/metrics`);
    return res.json();
  }

  public async getMLSamples(): Promise<any> {
    const res = await fetch(`${API_BASE}/ml/samples`);
    return res.json();
  }

  /**
   * Connect to Google Cloud Run WebSocket Relay
   */
  public connectWebSocket(
    scope: SubscriptionScope,
    onHazard: (hazard: Hazard, alert?: DriverAlert) => void,
    onAck?: (data: any) => void
  ) {
    this.onHazardCallback = onHazard;
    this.onAckCallback = onAck;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/v1/relay`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Send subscription replacement
        const subEnvelope: EventEnvelope<SubscriptionScope> = {
          schemaVersion: '1.0',
          messageId: `sub_${Date.now()}`,
          eventName: 'subscription.replace',
          sentAt: new Date().toISOString(),
          inputMode: 'live',
          payload: scope,
        };
        this.ws?.send(JSON.stringify(subEnvelope));
      };

      this.ws.onmessage = (event) => {
        try {
          const envelope: EventEnvelope = JSON.parse(event.data);
          if (envelope.eventName === 'hazard.upsert') {
            const p = envelope.payload as { hazard: Hazard; personalizedAlert?: DriverAlert };
            this.onHazardCallback?.(p.hazard, p.personalizedAlert);
          } else if (envelope.eventName === 'subscription.snapshot') {
            const p = envelope.payload as { hazards: Hazard[] };
            p.hazards.forEach((h) => this.onHazardCallback?.(h));
          } else if (envelope.eventName === 'ack') {
            this.onAckCallback?.(envelope.payload);
          }
        } catch (e) {
          console.warn('[MargAIClient] WS parse error:', e);
        }
      };

      this.ws.onclose = () => {
        this.scheduleReconnect(scope);
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch (err) {
      this.scheduleReconnect(scope);
    }
  }

  private scheduleReconnect(scope: SubscriptionScope) {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket(scope, this.onHazardCallback!, this.onAckCallback);
    }, 3000);
  }

  public disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const apiClient = new MargAIClient();
