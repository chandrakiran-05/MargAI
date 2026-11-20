#!/usr/bin/env bash
# ==============================================================================
# MargAI - Google Cloud Run & Cloud Build Deployment Pipeline
# Google Startup Buildathon India 2026
# ==============================================================================

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo "")}"
REGION="${GCP_REGION:-asia-south1}" # Default to Mumbai / India region
SERVICE_NAME="margai-relay"
IMAGE_TAG="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

echo "=================================================================="
echo "🚀 MargAI Google Cloud Deployment Pipeline"
echo "   Event:  Google Startup Buildathon India 2026"
echo "   Target: Google Cloud Run ($REGION)"
echo "   Project: $PROJECT_ID"
echo "=================================================================="

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: GCP_PROJECT_ID is not set. Run 'gcloud config set project <your-project-id>' first."
  exit 1
fi

# 1. Enable Required Google Cloud Services
echo "[1/4] Enabling required Google Cloud APIs..."
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  pubsub.googleapis.com \
  cloudbuild.googleapis.com \
  --project "$PROJECT_ID"

# 2. Build Container Image via Google Cloud Build
echo "[2/4] Submitting container build to Google Cloud Build..."
gcloud builds submit \
  --project "$PROJECT_ID" \
  --tag "$IMAGE_TAG" \
  --file infra/Dockerfile .

# 3. Deploy to Google Cloud Run
echo "[3/4] Deploying to Google Cloud Run ($REGION)..."
gcloud run deploy "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --image "$IMAGE_TAG" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production,K_SERVICE=$SERVICE_NAME"

# 4. Verification
echo "[4/4] Verifying Cloud Run deployment URL..."
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --platform managed --region "$REGION" --format "value(status.url)")

echo "=================================================================="
echo "✓ MargAI Cloud Run Deployment Successful!"
echo "  • HTTP Endpoint:      $SERVICE_URL/health"
echo "  • WebSocket Relay:    ${SERVICE_URL/https:/wss:}/v1/relay"
echo "  • OpenAPI Spec:       $SERVICE_URL/openapi.json"
echo "=================================================================="
