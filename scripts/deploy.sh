#!/bin/bash

# Atomic deployment script for Drevo Web
# Usage: ./deploy.sh <environment> <version>
# Example: ./deploy.sh staging 20240923-0900
# Example: ./deploy.sh production 1.2.0

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Utility functions
log_info() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARN:${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Argument validation
if [ $# -ne 2 ]; then
    log_error "Usage: $0 <environment> <version>"
    log_error "Environment: staging or production"
    log_error "Version format: YYYYMMDD-HHMM for staging, X.Y.Z for production"
    exit 1
fi

ENVIRONMENT="$1"
VERSION="$2"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    log_error "Environment must be 'staging' or 'production', got: $ENVIRONMENT"
    exit 1
fi

# Validate version format
if [ "$ENVIRONMENT" = "staging" ]; then
    if [[ ! "$VERSION" =~ ^[0-9]{8}-[0-9]{4}$ ]]; then
        log_error "Staging version must match format YYYYMMDD-HHMM, got: $VERSION"
        exit 1
    fi
elif [ "$ENVIRONMENT" = "production" ]; then
    if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        log_error "Production version must match format X.Y.Z, got: $VERSION"
        exit 1
    fi
fi

log_info "Starting deployment for $ENVIRONMENT environment, version $VERSION"

# Base directory
BASE_DIR="$HOME"
RELEASES_DIR="$BASE_DIR/releases/$ENVIRONMENT"
RELEASE_DIR="$RELEASES_DIR/$VERSION"
CURRENT_LINK="$BASE_DIR/current-$ENVIRONMENT"
PREVIOUS_LINK="$BASE_DIR/previous-$ENVIRONMENT"
LOGS_DIR="$BASE_DIR/logs"

# Release readiness check
log_info "Checking release readiness..."

if [ ! -d "$RELEASE_DIR" ]; then
    log_error "Release directory does not exist: $RELEASE_DIR"
    exit 1
fi

if [ ! -f "$RELEASE_DIR/server/server.mjs" ]; then
    log_error "Build verification failed: server/server.mjs not found in $RELEASE_DIR"
    exit 1
fi

log_info "Release readiness check passed"

# Ensure required directories exist
log_info "Ensuring required directories exist..."

mkdir -p "$RELEASES_DIR"
mkdir -p "$LOGS_DIR"

log_info "Required directories created/verified"

# Save current symlink for rollback (if exists)
if [ -L "$CURRENT_LINK" ]; then
    log_info "Saving current symlink for rollback..."
    cp -P "$CURRENT_LINK" "$PREVIOUS_LINK" || {
        log_warn "Failed to save current symlink for rollback"
    }
    log_info "Current symlink saved to $PREVIOUS_LINK"
else
    log_warn "No current symlink found, skipping rollback preparation"
fi

# Atomic symlink switching
log_info "Performing atomic symlink switch..."

TEMP_LINK="$CURRENT_LINK.tmp.$$"

# Create temporary symlink
ln -sfn "$RELEASE_DIR" "$TEMP_LINK"

# Atomic move
mv "$TEMP_LINK" "$CURRENT_LINK"

log_info "Symlink switched atomically: $CURRENT_LINK -> $RELEASE_DIR"

# PM2 management (PREPARE BUT DO NOT EXECUTE)
log_info "Preparing PM2 reload command (NOT EXECUTING YET):"
PM2_COMMAND="pm2 reload ecosystem.config.js --only drevo-$ENVIRONMENT"
log_warn "PM2 Command to run manually: $PM2_COMMAND"
log_warn "PM2 integration will be enabled in future iteration"

# Automatic cleanup of releases
log_info "Starting automatic cleanup of old releases..."

# Find all directories in releases folder, sort by creation time (newest first)
RELEASE_DIRS=$(find "$RELEASES_DIR" -maxdepth 1 -type d -not -path "$RELEASES_DIR" | sort -t/ -k2 -r)
RELEASE_COUNT=$(echo "$RELEASE_DIRS" | wc -l | tr -d ' ')

log_info "Found $RELEASE_COUNT releases in $RELEASES_DIR"

if [ "$RELEASE_COUNT" -gt 5 ]; then
    RELEASES_TO_DELETE=$(echo "$RELEASE_DIRS" | tail -n +6)
    
    log_info "Cleaning up old releases (keeping latest 5):"
    
    echo "$RELEASES_TO_DELETE" | while read -r dir; do
        if [ -n "$dir" ] && [ -d "$dir" ]; then
            log_info "Deleting old release: $dir"
            rm -rf "$dir"
        fi
    done
    
    log_info "Cleanup completed"
else
    log_info "No cleanup needed (total releases: $RELEASE_COUNT, limit: 5)"
fi

# Final verification
if [ -L "$CURRENT_LINK" ] && [ "$(readlink "$CURRENT_LINK")" = "$RELEASE_DIR" ]; then
    log_info "Deployment verification successful"
    log_info "Current symlink points to: $(readlink "$CURRENT_LINK")"
    
    # Display deployment summary
    echo ""
    log_info "=== DEPLOYMENT SUMMARY ==="
    log_info "Environment: $ENVIRONMENT"
    log_info "Version: $VERSION"
    log_info "Release path: $RELEASE_DIR"
    log_info "Current symlink: $CURRENT_LINK"
    if [ -L "$PREVIOUS_LINK" ]; then
        log_info "Previous version (for rollback): $(readlink "$PREVIOUS_LINK")"
    fi
    log_info "==========================="
    echo ""
    
    log_info "✅ Atomic deployment completed successfully!"
    
    # Instructions for manual PM2 reload
    echo ""
    log_warn "Next steps (manual):"
    log_warn "1. Run: $PM2_COMMAND"
    log_warn "2. Check status: pm2 status"
    log_warn "3. Monitor logs: pm2 logs drevo-$ENVIRONMENT"
    echo ""
    
else
    log_error "Deployment verification failed: symlink not pointing to expected target"
    exit 1
fi
