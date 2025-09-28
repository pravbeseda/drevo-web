#!/bin/bash

# Development server script with dynamic base path configuration
# For local development and testing
# Usage: ./scripts/dev-server.sh [staging|production|dev]
# Note: This is for LOCAL development only, not production deployment
# For production deployment, use deploy.sh instead

set -e

ENVIRONMENT=${1:-production}

case $ENVIRONMENT in
  "staging")
    BASE_PATH="/staging"
    PORT=4001
    echo "🔧 Development server for staging environment"
    echo "ℹ️  For production deployment, use deploy.sh instead"
    npm run build:staging
    ;;
  "production")
    BASE_PATH="/new"
    PORT=4002
    echo "🔧 Development server for production environment"
    echo "ℹ️  For production deployment, use deploy.sh instead"
    npm run build:prod
    ;;
  "dev")
    BASE_PATH="/"
    PORT=4000
    echo "🔧 Development server for dev path"
    echo "ℹ️  For production deployment, use deploy.sh instead"
    npm run build
    ;;
  *)
    echo "❌ Unknown environment: $ENVIRONMENT"
    echo "Usage: $0 [staging|production|dev]"
    exit 1
    ;;
esac

echo "✅ Build completed for $ENVIRONMENT environment"
echo "🔧 Base path: $BASE_PATH"
echo "🔧 Port: $PORT"
echo ""
echo "🎯 Starting LOCAL development server..."
echo "📝 Note: This is for development/testing only"
echo "📝 For production deployment, use deploy.sh"

SERVER_FILE="dist/apps/client/server/server.mjs"
if [ ! -f "$SERVER_FILE" ]; then
  echo "❌ Server file not found: $SERVER_FILE"
  echo "   Build may have failed or output path is incorrect."
  exit 1
fi
BASE_PATH=$BASE_PATH PORT=$PORT node "$SERVER_FILE"
