#!/bin/bash

# Development server script with dynamic base path configuration
# For local development and testing
# Usage: ./scripts/dev-server.sh [staging|production|dev|local]
# Note: This is for LOCAL development only, not production deployment
# For production deployment, use deploy.sh instead

set -e

ENVIRONMENT=${1:-local}
PROXY_CONFIG=""

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
    BASE_PATH="/new"
    PORT=4200
    echo "🔧 Development server for dev path (/new)"
    echo "ℹ️  For production deployment, use deploy.sh instead"
    npm run build:prod
    ;;
  "local")
    BASE_PATH="/"
    PORT=4200
    PROXY_CONFIG="apps/client/proxy.conf.json"
    echo "🔧 Development server for LOCAL Angular-First environment"
    echo "📋 Using proxy.conf.json to connect to drevo-local.ru"
    echo "ℹ️  For production deployment, use deploy.sh instead"
    npm run build
    ;;
  *)
    echo "❌ Unknown environment: $ENVIRONMENT"
    echo "Usage: $0 [staging|production|dev|local]"
    exit 1
    ;;
esac

echo "✅ Build completed for $ENVIRONMENT environment"
echo "🔧 Base path: $BASE_PATH"
echo "🔧 Port: $PORT"
if [ -n "$PROXY_CONFIG" ]; then
  echo "🔀 Proxy config: $PROXY_CONFIG"
fi
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
BASE_PATH=$BASE_PATH PORT=$PORT PROXY_CONFIG=$PROXY_CONFIG node "$SERVER_FILE"
