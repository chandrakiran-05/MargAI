#!/usr/bin/env bash
set -e

# Ensure Google Cloud SDK is on PATH
export PATH="/Users/purushothambalamurali/google-cloud-sdk/bin:$PATH"

# ==============================================================================
# MargAI - Google Startup Buildathon India 2026
# Automated Google Cloud Run & Cloud Build Deployment Script
# ==============================================================================

echo "=========================================================================="
echo "🚗 Deploying MargAI to Google Cloud Run (Mumbai Region: asia-south1)"
echo "=========================================================================="

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${GOOGLE_CLOUD_REGION:-asia-south1}"

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: Google Cloud Project ID not detected."
  echo "Please run: gcloud config set project <YOUR_PROJECT_ID>"
  exit 1
fi

echo "🔹 Project ID:  $PROJECT_ID"
echo "🔹 Region:      $REGION"

# 1. Enable Required Google Cloud APIs
echo "Step 1/5: Enabling Cloud Run, Cloud Build, Firestore & Storage APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  --project="$PROJECT_ID"

# 2. Ensure Firestore Database Exists
echo "Step 2/5: Verifying Firestore Database..."
if ! gcloud firestore databases describe --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Creating Firestore Database in Native mode ($REGION)..."
  gcloud firestore databases create --location="$REGION" --type=firestore-native --project="$PROJECT_ID" || true
fi

# 3. Ensure Cloud Storage Evidence Bucket Exists
EVIDENCE_BUCKET="${PROJECT_ID}-margai-evidence"
echo "Step 3/5: Verifying Cloud Storage Evidence Bucket ($EVIDENCE_BUCKET)..."
if ! gcloud storage buckets describe "gs://${EVIDENCE_BUCKET}" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Creating Cloud Storage Bucket gs://${EVIDENCE_BUCKET}..."
  gcloud storage buckets create "gs://${EVIDENCE_BUCKET}" --location="$REGION" --project="$PROJECT_ID" || true
fi

# 4. Build & Deploy Relay API to Google Cloud Run (WebSocket Enabled)
echo "Step 4/5: Building & Deploying margai-relay-api to Cloud Run..."
gcloud builds submit --config=cloudbuild-relay.yaml .
gcloud run deploy margai-relay-api \
  --image="gcr.io/${PROJECT_ID}/margai-relay-api" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --allow-unauthenticated \
  --session-affinity \
  --timeout=3600 \
  --min-instances=1 \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GCS_EVIDENCE_BUCKET=${EVIDENCE_BUCKET}"

RELAY_URL=$(gcloud run services describe margai-relay-api --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)')
echo "✅ Relay API Deployed: $RELAY_URL"

# 5. Build & Deploy Cockpit Web App
echo "Step 5/5: Building & Deploying margai-cockpit-web to Cloud Run..."
gcloud builds submit --config=cloudbuild-cockpit.yaml .
gcloud run deploy margai-cockpit-web \
  --image="gcr.io/${PROJECT_ID}/margai-cockpit-web" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --allow-unauthenticated

COCKPIT_URL=$(gcloud run services describe margai-cockpit-web --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)')

echo "=========================================================================="
echo "🎉 MargAI Production Deployment Complete!"
echo "🚗 Tesla MCU Infotainment HUD: $COCKPIT_URL/infotainment"
echo "📱 Smartphone Edge-ML Cam:    $COCKPIT_URL/phone"
echo "📡 Cloud Run WebSocket Relay:   $RELAY_URL/ws"
echo "🩺 Health Check Endpoint:       $RELAY_URL/health"
echo "=========================================================================="
