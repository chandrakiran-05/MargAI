import http from 'http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import {
  ObservationPayloadSchema,
  ObservationPayload,
  DriverAlert,
  EventEnvelope,
} from '@margai/contracts';
import { RiskEngine } from './riskEngine.js';
import { MargAIStore } from './store.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const riskEngine = new RiskEngine();
const store = new MargAIStore();

// Track active WebSocket subscribers
interface ClientMetadata {
  isAlive: boolean;
  role: 'phone_node' | 'infotainment_hud' | 'general';
  subscriptions: Set<string>;
}
const clients = new Map<WebSocket, ClientMetadata>();

// Latest device telemetry cache for dashboard polling
let latestTelemetry: any = {
  speedKmh: 45,
  zAccelG: 1.02,
  headingDeg: 120,
  latitude: 12.9716,
  longitude: 77.5946,
  updatedAt: new Date().toISOString(),
};

/* ==========================================================================
   REST API Endpoints (Google Cloud Run / Kubernetes Probes)
========================================================================== */

// 1. Cloud Run Health Check Probe
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'MargAI Cloud Run Relay API',
    uptimeSec: Math.round(process.uptime()),
    activeWebSocketClients: clients.size,
    timestamp: new Date().toISOString(),
  });
});

// 2. Ingest Smartphone Edge-ML Observation
app.post('/v1/observations', async (req: Request, res: Response) => {
  const parseResult = ObservationPayloadSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid observation payload format',
      details: parseResult.error.format(),
    });
  }

  const observation: ObservationPayload = parseResult.data;

  // Update telemetry from incoming observation
  if (observation.geo) {
    latestTelemetry = {
      speedKmh: Math.round((observation.geo.speedMps || 0) * 3.6),
      zAccelG: observation.imu?.zAccelG || 1.0,
      headingDeg: observation.geo.headingDeg || 0,
      latitude: observation.geo.latitude,
      longitude: observation.geo.longitude,
      shockwave: observation.imu?.shockwaveDetected || false,
      updatedAt: new Date().toISOString(),
    };
  }

  // Evaluate risk through deterministic risk engine
  const evalResult = riskEngine.evaluate(observation);
  await store.saveObservation(observation);

  let broadcastedAlert: DriverAlert | null = null;
  if (evalResult.isRelevant) {
    broadcastedAlert = riskEngine.generateDriverAlert(observation, evalResult);
    await store.saveAlert(broadcastedAlert);

    // Broadcast to all connected Tesla MCU infotainment screens
    broadcastToSubscribers('alerts', {
      eventId: `evt_${Date.now()}`,
      timestamp: new Date().toISOString(),
      sourceDeviceId: observation.deviceId,
      topic: 'alert.broadcast',
      payload: broadcastedAlert,
    });
  }

  return res.status(201).json({
    status: 'RECEIVED',
    observationId: observation.observationId,
    riskEvaluation: evalResult,
    alertEmitted: !!broadcastedAlert,
    driverAlert: broadcastedAlert,
  });
});

// 3. Spatial Query for Road Hazards
app.get('/v1/hazards', (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string) || 12.9716;
  const lng = parseFloat(req.query.lng as string) || 77.5946;
  const radius = parseFloat(req.query.radiusMeters as string) || 5000;

  const nearby = store.queryNearbyHazards(lat, lng, radius);
  const recentAlerts = store.getRecentAlerts(15);

  res.status(200).json({
    latitude: lat,
    longitude: lng,
    radiusMeters: radius,
    totalHazards: nearby.length,
    hazards: nearby,
    recentAlerts,
  });
});

// 4. Latest Telemetry
app.get('/v1/telemetry/latest', (_req: Request, res: Response) => {
  res.status(200).json(latestTelemetry);
});

/* ==========================================================================
   WebSocket Relay (Ultra-Low Latency Telemetry & Alert Stream)
========================================================================== */

wss.on('connection', (ws: WebSocket, req) => {
  const clientMeta: ClientMetadata = {
    isAlive: true,
    role: 'general',
    subscriptions: new Set(['alerts', 'telemetry']),
  };
  clients.set(ws, clientMeta);

  // Send handshake message
  ws.send(
    JSON.stringify({
      topic: 'handshake.connected',
      message: 'Connected to MargAI Cloud Run Relay Gateway',
      serverTime: new Date().toISOString(),
      capabilities: ['sub_15ms_broadcast', 'tesla_mcu_v12_stream'],
    })
  );

  ws.on('pong', () => {
    clientMeta.isAlive = true;
  });

  ws.on('message', async (data: string) => {
    try {
      const msg = JSON.parse(data.toString());

      // 1. Role identification & subscription management
      if (msg.action === 'register') {
        clientMeta.role = msg.role || 'general';
        if (Array.isArray(msg.topics)) {
          msg.topics.forEach((t: string) => clientMeta.subscriptions.add(t));
        }
        return;
      }

      // 2. Real-time telemetry stream from Smartphone Client
      if (msg.action === 'telemetry') {
        latestTelemetry = {
          ...msg.payload,
          updatedAt: new Date().toISOString(),
        };

        // Broadcast telemetry to Infotainment HUD clients
        broadcastToSubscribers('telemetry', {
          eventId: `tel_${Date.now()}`,
          timestamp: new Date().toISOString(),
          sourceDeviceId: msg.deviceId || 'phone_node',
          topic: 'telemetry.heartbeat',
          payload: latestTelemetry,
        });
        return;
      }

      // 3. Direct Edge-ML Observation via WebSocket
      if (msg.action === 'observation') {
        const parseResult = ObservationPayloadSchema.safeParse(msg.payload);
        if (parseResult.success) {
          const obs = parseResult.data;
          const evalResult = riskEngine.evaluate(obs);
          await store.saveObservation(obs);

          if (evalResult.isRelevant) {
            const alert = riskEngine.generateDriverAlert(obs, evalResult);
            await store.saveAlert(alert);
            broadcastToSubscribers('alerts', {
              eventId: `evt_${Date.now()}`,
              timestamp: new Date().toISOString(),
              sourceDeviceId: obs.deviceId,
              topic: 'alert.broadcast',
              payload: alert,
            });
          }
        }
      }
    } catch (err: any) {
      console.warn('[WS] Malformed message received:', err.message);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

// Heartbeat ping interval to keep Cloud Run connections alive
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    const meta = clients.get(ws);
    if (!meta) return;
    if (!meta.isAlive) {
      ws.terminate();
      clients.delete(ws);
      return;
    }
    meta.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

function broadcastToSubscribers(topic: string, envelope: EventEnvelope) {
  const payloadStr = JSON.stringify(envelope);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const meta = clients.get(client);
      if (meta && meta.subscriptions.has(topic)) {
        client.send(payloadStr);
      }
    }
  });
}

/* ==========================================================================
   Server Listener (Cloud Run PORT or Default 8080)
========================================================================== */
const PORT = parseInt(process.env.PORT || '8080', 10);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 MargAI Cloud Run Relay API Server Online`);
  console.log(`📍 HTTP REST:      http://0.0.0.0:${PORT}`);
  console.log(`📡 WebSocket:      ws://0.0.0.0:${PORT}/ws`);
  console.log(`🩺 Health Probe:   http://0.0.0.0:${PORT}/health`);
  console.log(`=======================================================`);
});
