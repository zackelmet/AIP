#!/bin/bash

# Affordable Pentesting Backend - Deployment Script

echo "🚀 Affordable Pentesting Backend Deployment"
echo "===================================="
echo ""

# Check if ANTHROPIC_API_KEY is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ Error: ANTHROPIC_API_KEY environment variable not set"
    echo ""
    echo "Please set it first:"
    echo "  export ANTHROPIC_API_KEY='your-key-here'"
    echo ""
    echo "Get your key from: https://console.anthropic.com/settings/keys"
    exit 1
fi

echo "✅ Anthropic API key found"
echo "📦 Project: msp-ai-pentester"
echo "🌍 Region: us-east1"
echo ""

# Deploy to Cloud Run
echo "🚢 Deploying to Cloud Run..."
gcloud run deploy msp-pentest-backend \
  --source . \
  --project msp-ai-pentester \
  --region us-east1 \
  --allow-unauthenticated \
  --set-env-vars="GCP_WEBHOOK_SECRET=9e33b83b7ae6aeda980df8152927aba5551ecd5e718b6bd475bde3902ad6ecd3,ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY,WEBAPP_API_URL=https://affordable-pentesting.vercel.app/api/pentests,GCS_BUCKET_NAME=msp-pentest-reports,GCP_PROJECT_ID=msp-ai-pentester" \
  --timeout=3600 \
  --memory=2Gi \
  --cpu=2

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Note your Cloud Run URL above"
    echo "2. Update Vercel environment variable:"
    echo "   vercel env rm BACKEND_WEBHOOK_URL production"
    echo "   vercel env add BACKEND_WEBHOOK_URL production"
    echo "   # Value: https://your-service-url.run.app/execute-pentest"
    echo ""
else
    echo ""
    echo "❌ Deployment failed. Check the error above."
    exit 1
fi
