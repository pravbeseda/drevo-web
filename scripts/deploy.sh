#!/bin/bash

# Deployment parameters
DEPLOY_PATH="$1"
ENV="$2"

# Check if required parameters are provided
if [ -z "$DEPLOY_PATH" ] || [ -z "$ENV" ]; then
    echo "Usage: $0 <deploy_path> <environment>"
    exit 1
fi

# Update code
echo "📦 Deploying to $ENV environment at $DEPLOY_PATH..."

cp -r dist/apps/client/* "$DEPLOY_PATH"
chmod -R 755 "$DEPLOY_PATH"

# Clear cache
if [ -d "$DEPLOY_PATH/cache" ]; then
    rm -rf "$DEPLOY_PATH/cache/*"
fi

echo "✅ Deployment completed successfully!"
