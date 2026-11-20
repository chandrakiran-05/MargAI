# Multi-stage Dockerfile for MargAI Relay API on Google Cloud Run
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json tsconfig.base.json ./
COPY packages/contracts ./packages/contracts
COPY services/relay-api ./services/relay-api

# Install dependencies and build
RUN npm install
RUN npm run build -w packages/contracts
RUN npm run build -w services/relay-api

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY package.json ./
COPY --from=builder /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/services/relay-api/package.json ./services/relay-api/package.json
COPY --from=builder /app/services/relay-api/dist ./services/relay-api/dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8080

CMD ["node", "services/relay-api/dist/server.js"]
