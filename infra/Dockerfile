# Multi-stage Dockerfile for MargAI Google Cloud Run Deployment
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace configuration
COPY package.json tsconfig.base.json tsconfig.json ./
COPY packages/ ./packages/
COPY services/ ./services/
COPY apps/web/ ./apps/web/

# Install dependencies and build all packages
RUN npm install
RUN npm run build

# Runtime Stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/api/dist ./services/api/dist
COPY --from=builder /app/services/api/package.json ./services/api/package.json
COPY --from=builder /app/apps/web/dist ./apps/web/dist

EXPOSE 8080

CMD ["node", "services/api/dist/index.js"]
