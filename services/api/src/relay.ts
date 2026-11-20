import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import {
  EventEnvelope,
  SubscriptionScope,
  Hazard,
  DriverAlert,
  Observation,
} from '@margai/contracts';
import { storageEngine } from './store';
import { evaluateHazardForDriver } from '@margai/risk-engine';

interface ConnectedClient {
  ws: WebSocket;
  clientId: string;
  scope?: SubscriptionScope;
  lastPingMs: number;
}

export class MargAIRealtimeRelay {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ConnectedClient> = new Map();

  public init(server: HttpServer): WebSocketServer {
    this.wss = new WebSocketServer({ server, path: '/v1/relay' });

    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = `client_${Math.random().toString(36).slice(2, 9)}`;
      const clientRecord: ConnectedClient = {
        ws,
        clientId,
        lastPingMs: Date.now(),
      };
      this.clients.set(clientId, clientRecord);

      ws.on('message', (data: string | Buffer) => {
        try {
          const envelope: EventEnvelope = JSON.parse(data.toString());
          this.handleIncomingEvent(clientRecord, envelope);
        } catch (err) {
          console.error('[WebSocket] Malformed message received:', err);
          this.sendEnvelope(ws, {
            schemaVersion: '1.0',
            messageId: `err_${Date.now()}`,
            eventName: 'error',
            sentAt: new Date().toISOString(),
            inputMode: 'live',
            payload: { message: 'Invalid JSON payload' },
          });
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
      });

      ws.on('error', (err) => {
        console.warn(`[WebSocket] Client ${clientId} socket error:`, err);
        this.clients.delete(clientId);
      });

      // Send initial welcome ack
      this.sendEnvelope(ws, {
        schemaVersion: '1.0',
        messageId: `ack_${Date.now()}`,
        eventName: 'ack',
        sentAt: new Date().toISOString(),
        inputMode: 'live',
        payload: {
          clientId,
          status: 'connected',
          relayProvider: 'Google Cloud Run WebSocket Stream',
        },
      });
    });

    return this.wss;
  }

  private handleIncomingEvent(client: ConnectedClient, envelope: EventEnvelope) {
    const { eventName, payload } = envelope;

    if (eventName === 'subscription.replace') {
      const scope = payload as SubscriptionScope;
      client.scope = scope;

      // Immediately respond with snapshot of active hazards on the corridor
      const activeHazards = storageEngine.getHazards({
        corridorId: scope.corridorId,
        activeOnly: true,
      });

      this.sendEnvelope(client.ws, {
        schemaVersion: '1.0',
        messageId: `snap_${Date.now()}`,
        eventName: 'subscription.snapshot',
        sentAt: new Date().toISOString(),
        inputMode: envelope.inputMode,
        payload: {
          clientId: client.clientId,
          corridorId: scope.corridorId,
          hazards: activeHazards,
        },
      });
    } else if (eventName === 'observation.submit') {
      const startMs = Date.now();
      const obs = payload as Observation;
      const { hazard, isNew, caseUpdated } = storageEngine.ingestObservation(obs);

      // Record relay latency
      storageEngine.recordLatency('server_relay', Date.now() - startMs);

      // Broadcast hazard update to all interested clients
      this.broadcastHazardUpsert(hazard, envelope.inputMode);

      // Send ack to submitter
      this.sendEnvelope(client.ws, {
        schemaVersion: '1.0',
        messageId: `ack_${Date.now()}`,
        eventName: 'ack',
        sentAt: new Date().toISOString(),
        inputMode: envelope.inputMode,
        payload: {
          observationId: obs.id,
          hazardId: hazard.id,
          revision: hazard.revision,
          isNew,
          verificationState: hazard.verificationState,
        },
      });
    } else if (eventName === 'capability.update') {
      // Driver updated thermal or camera status
    }
  }

  /**
   * Broadcasts a new or updated hazard to clients on matching corridors.
   * Computes personalized DriverAlert per client.
   */
  public broadcastHazardUpsert(hazard: Hazard, inputMode: EventEnvelope['inputMode'] = 'live') {
    const relayStartMs = Date.now();

    for (const client of this.clients.values()) {
      if (!client.scope) continue;

      // Filter by corridor
      if (client.scope.corridorId !== hazard.roadReference.corridorId) {
        continue;
      }

      // Evaluate personalized driver alert
      const alert = evaluateHazardForDriver(
        hazard,
        client.scope.vehiclePose,
        {
          currentCorridorId: client.scope.corridorId,
          currentEdgeId: client.scope.currentEdgeId,
          upcomingEdgeIds: client.scope.upcomingEdgeIds || [],
        }
      );

      // Send hazard upsert envelope with optional alert
      this.sendEnvelope(client.ws, {
        schemaVersion: '1.0',
        messageId: `haz_${hazard.id}_r${hazard.revision}_${Date.now()}`,
        eventName: 'hazard.upsert',
        sentAt: new Date().toISOString(),
        inputMode,
        payload: {
          hazard,
          personalizedAlert: alert,
        },
      });
    }

    storageEngine.recordLatency('server_relay', Date.now() - relayStartMs);
  }

  private sendEnvelope(ws: WebSocket, envelope: EventEnvelope) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(envelope));
    }
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

export const realtimeRelay = new MargAIRealtimeRelay();
