export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'MargAI Road Safety & Civic Intelligence API',
    version: '1.0.0',
    description:
      'Backend and Realtime Relay API for MargAI smartphone-first road hazard warning & civic maintenance system for Google Startup Buildathon India 2026.',
  },
  servers: [
    { url: 'http://localhost:8080', description: 'Local Development Server' },
    { url: 'https://margai-api-gateway-run.app', description: 'Google Cloud Run Production' },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Service health check',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    uptime: { type: 'number' },
                    timestamp: { type: 'string' },
                    cloudService: { type: 'string', example: 'Google Cloud Run' },
                    storageBackend: { type: 'string', example: 'Cloud Firestore' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/v1/observations': {
      post: {
        summary: 'Submit new road observation from vehicle perception',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Observation' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Observation accepted and queued for clustering',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    observationId: { type: 'string' },
                    status: { type: 'string', example: 'clustered' },
                    hazardId: { type: 'string' },
                    hazardRevision: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/v1/hazards': {
      get: {
        summary: 'Query active hazards by corridor or bounding corridor',
        parameters: [
          { name: 'corridorId', in: 'query', schema: { type: 'string' } },
          { name: 'lat', in: 'query', schema: { type: 'number' } },
          { name: 'lng', in: 'query', schema: { type: 'number' } },
          { name: 'radiusM', in: 'query', schema: { type: 'number', default: 2000 } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'List of matching active hazards',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Hazard' },
                },
              },
            },
          },
        },
      },
    },
    '/v1/hazards/{id}': {
      get: {
        summary: 'Get single hazard details with complete evidence log',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Hazard details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Hazard' },
              },
            },
          },
          '404': { description: 'Hazard not found' },
        },
      },
    },
    '/v1/evidence/upload-intents': {
      post: {
        summary: 'Create signed URL intent for media evidence upload to Google Cloud Storage',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  observationId: { type: 'string' },
                  contentType: { type: 'string', example: 'image/jpeg' },
                  sizeBytes: { type: 'number' },
                },
                required: ['observationId', 'contentType'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Upload intent created with GCS signed URL',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    uploadUrl: { type: 'string' },
                    evidenceRef: { type: 'string' },
                    expiresAt: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/v1/cases': {
      get: {
        summary: 'List civic maintenance cases for municipal authority review (e.g. BBMP, NHAI)',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'jurisdiction', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'List of civic cases',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/CivicCase' },
                },
              },
            },
          },
        },
      },
    },
    '/v1/cases/{id}/gemini-report': {
      post: {
        summary: 'Generate formal civic grievance report using Google Gemini 2.5 Flash',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Gemini generated report',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    caseId: { type: 'string' },
                    markdownReport: { type: 'string' },
                    urgencyRating: { type: 'string' },
                    applicableLaws: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/v1/config': {
      get: {
        summary: 'Client configuration, active feature flags, and Google service states',
        responses: {
          '200': {
            description: 'Configuration map',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    googleMapsApiKeyConfigured: { type: 'boolean' },
                    geminiConfigured: { type: 'boolean' },
                    firestoreConnected: { type: 'boolean' },
                    supportedCorridors: { type: 'array', items: { type: 'string' } },
                    version: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Observation: {
        type: 'object',
        required: ['id', 'sourceId', 'captureTime', 'vehiclePose', 'perceptionOutput'],
        properties: {
          id: { type: 'string' },
          sourceId: { type: 'string' },
          captureTime: { type: 'string', format: 'date-time' },
          vehiclePose: { $ref: '#/components/schemas/VehiclePose' },
          perceptionOutput: {
            type: 'array',
            items: { $ref: '#/components/schemas/FrameDetection' },
          },
        },
      },
      VehiclePose: {
        type: 'object',
        required: ['latitude', 'longitude', 'headingDeg', 'speedMps'],
        properties: {
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          headingDeg: { type: 'number' },
          speedMps: { type: 'number' },
          horizontalAccuracyM: { type: 'number' },
        },
      },
      FrameDetection: {
        type: 'object',
        required: ['class', 'confidence', 'bbox', 'frameTimeMs'],
        properties: {
          class: { type: 'string' },
          confidence: { type: 'number' },
          bbox: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              width: { type: 'number' },
              height: { type: 'number' },
            },
          },
          frameTimeMs: { type: 'number' },
        },
      },
      Hazard: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          revision: { type: 'number' },
          confidence: { type: 'number' },
          verificationState: { type: 'string' },
          location: { type: 'object' },
          roadReference: { type: 'object' },
        },
      },
      CivicCase: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          hazardId: { type: 'string' },
          status: { type: 'string' },
          jurisdiction: { type: 'string' },
          severityScore: { type: 'number' },
        },
      },
    },
  },
};
