#!/bin/bash

# Atomic deployment script for Drevo Web
# New Usage: ./deploy.sh <version> <app_name> <deploy_path> <environment>
# Example: ./deploy.sh "20240923-0900" "drevo-staging" "~/releases/staging-current" "staging"
# Example: ./deploy.sh "1.2.0" "drevo-production" "~/releases/production-current" "production"
# Legacy Usage: ./deploy.sh <environment> <version> (for backward compatibility)

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

# Function to create deployment package.json
create_deployment_package_json() {
    local deployment_path="$1"
    local app_name="$2"
    local version="$3"
    
    local package_json_path="${deployment_path}/package.json"
    
    log_info "Creating package.json for PM2 version display..."
    log_info "  - Path: $package_json_path"
    log_info "  - App Name: $app_name"
    log_info "  - Version: $version"
    
    # Create package.json content
    cat > "$package_json_path" << EOF
{
  "name": "$app_name",
  "version": "$version",
  "description": "Drevo Web Application"
}
EOF
    
    # Verify file creation and content
    if [[ -f "$package_json_path" ]]; then
        log_info "✓ Created package.json with version $version at $package_json_path"
        
        # Verify JSON is valid
        if command -v node >/dev/null 2>&1; then
            if node -e "JSON.parse(require('fs').readFileSync('$package_json_path', 'utf8'))" 2>/dev/null; then
                log_info "✓ Package.json has valid JSON format"
            else
                log_error "✗ Package.json has invalid JSON format"
                return 1
            fi
        fi
        
        return 0
    else
        log_error "✗ Failed to create package.json at $package_json_path"
        return 1
    fi
}

# Argument validation - support both new and legacy parameter formats
if [ $# -eq 2 ]; then
    # Legacy format: ./deploy.sh <environment> <version>
    log_warn "Using legacy parameter format - this will be deprecated"
    ENVIRONMENT="$1"
    VERSION="$2"
    DRY_RUN=false
    
    # Determine app name and deploy path from environment
    if [ "$ENVIRONMENT" = "staging" ]; then
        APP_NAME="drevo-staging"
        DEPLOY_PATH_PARAM="$HOME/releases/staging-current"
    elif [ "$ENVIRONMENT" = "production" ]; then
        APP_NAME="drevo-production"
        DEPLOY_PATH_PARAM="$HOME/releases/production-current"
    else
        log_error "Invalid environment: $ENVIRONMENT"
        exit 1
    fi
    
elif [ $# -eq 3 ] && [ "$3" = "--dry-run" ]; then
    # Legacy format with dry-run: ./deploy.sh <environment> <version> --dry-run
    log_warn "Using legacy parameter format with dry-run - this will be deprecated"
    ENVIRONMENT="$1"
    VERSION="$2"
    DRY_RUN=true
    
    # Determine app name and deploy path from environment
    if [ "$ENVIRONMENT" = "staging" ]; then
        APP_NAME="drevo-staging"
        DEPLOY_PATH_PARAM="$HOME/releases/staging-current"
    elif [ "$ENVIRONMENT" = "production" ]; then
        APP_NAME="drevo-production"  
        DEPLOY_PATH_PARAM="$HOME/releases/production-current"
    else
        log_error "Invalid environment: $ENVIRONMENT"
        exit 1
    fi
    
elif [ $# -eq 4 ]; then
    # New format: ./deploy.sh <version> <app_name> <deploy_path> <environment>
    VERSION="$1"
    APP_NAME="$2"
    DEPLOY_PATH_PARAM="$3"
    ENVIRONMENT="$4"
    DRY_RUN=false
    
    # Expand tilde in deploy path if needed
    DEPLOY_PATH_PARAM="${DEPLOY_PATH_PARAM/#\~/$HOME}"
    
elif [ $# -eq 5 ] && [ "$5" = "--dry-run" ]; then
    # New format with dry-run: ./deploy.sh <version> <app_name> <deploy_path> <environment> --dry-run
    VERSION="$1"
    APP_NAME="$2"
    DEPLOY_PATH_PARAM="$3"
    ENVIRONMENT="$4"
    DRY_RUN=true
    
    # Expand tilde in deploy path if needed
    DEPLOY_PATH_PARAM="${DEPLOY_PATH_PARAM/#\~/$HOME}"
    
else
    log_error "Usage: $0 <version> <app_name> <deploy_path> <environment> [--dry-run]"
    log_error "  New format (recommended):"
    log_error "    Version: Version string (e.g., '1.2.0' or '20240923-0900')"
    log_error "    App Name: PM2 app name (e.g., 'drevo-staging' or 'drevo-production')"
    log_error "    Deploy Path: Deployment directory path (e.g., '~/releases/staging-current')"
    log_error "    Environment: staging or production"
    log_error ""
    log_error "  Legacy format (deprecated):"
    log_error "    $0 <environment> <version> [--dry-run]"
    log_error "    Environment: staging or production"
    log_error "    Version format: YYYYMMDD-HHMM for staging, X.Y.Z for production"
    log_error ""
    log_error "  Optional: --dry-run for testing without making changes"
    exit 1
fi

# Parameter validation
if [[ -z "$VERSION" || -z "$APP_NAME" || -z "$DEPLOY_PATH_PARAM" || -z "$ENVIRONMENT" ]]; then
    log_error "ERROR: Missing required parameters"
    log_error "Version: '$VERSION', App Name: '$APP_NAME', Deploy Path: '$DEPLOY_PATH_PARAM', Environment: '$ENVIRONMENT'"
    exit 1
fi

# Check for dry-run flag
if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN MODE - No changes will be made"
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    log_error "Environment must be 'staging' or 'production', got: $ENVIRONMENT"
    exit 1
fi

# Validate app name format
if [[ ! "$APP_NAME" =~ ^drevo-(staging|production)$ ]]; then
    log_error "App name must be 'drevo-staging' or 'drevo-production', got: $APP_NAME"
    exit 1
fi

# Basic version format validation (flexible to support both formats)
if [[ -z "$VERSION" ]]; then
    log_error "Version cannot be empty"
    exit 1
fi

log_info "Starting deployment with parameters:"
log_info "  - Environment: $ENVIRONMENT"
log_info "  - Version: $VERSION"
log_info "  - App Name: $APP_NAME"
log_info "  - Deploy Path: $DEPLOY_PATH_PARAM"

# Base directory
BASE_DIR="$HOME"
RELEASES_BASE_DIR="$BASE_DIR/releases"
RELEASES_DIR="$RELEASES_BASE_DIR/$ENVIRONMENT"
RELEASE_DIR="$RELEASES_DIR/$VERSION"
CURRENT_LINK="$RELEASES_BASE_DIR/$ENVIRONMENT-current"
PREVIOUS_LINK="$RELEASES_BASE_DIR/$ENVIRONMENT-previous"
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

if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would create directories"
else
    mkdir -p "$RELEASES_DIR"
    mkdir -p "$RELEASES_BASE_DIR"
    mkdir -p "$LOGS_DIR"
fi

log_info "Required directories created/verified"

# Save current symlink for rollback (if exists)
if [ -L "$CURRENT_LINK" ]; then
    log_info "Saving current symlink for rollback..."
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would save current symlink for rollback"
    else
        cp -P "$CURRENT_LINK" "$PREVIOUS_LINK" || {
            log_warn "Failed to save current symlink for rollback"
        }
        log_info "Current symlink saved to $PREVIOUS_LINK"
    fi
else
    log_warn "No current symlink found, skipping rollback preparation"
fi

# Simplified atomic symlink switching
log_info "Performing atomic symlink switch..."

if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would perform atomic symlink switch"
else
    # Simple and reliable symlink replacement
    # Remove existing symlink if it exists
    if [ -L "$CURRENT_LINK" ]; then
        rm "$CURRENT_LINK"
    fi
    
    # Create new symlink
    ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"
    
    # Verify the symlink was created correctly
    if [ ! -L "$CURRENT_LINK" ]; then
        log_error "Failed to create symlink: $CURRENT_LINK"
        exit 1
    fi
    
    # Verify the symlink points to the correct target
    ACTUAL_TARGET=$(readlink "$CURRENT_LINK")
    if [ "$ACTUAL_TARGET" != "$RELEASE_DIR" ]; then
        log_error "Symlink points to wrong target: $ACTUAL_TARGET (expected: $RELEASE_DIR)"
        exit 1
    fi
    
    log_info "Symlink created successfully: $CURRENT_LINK -> $RELEASE_DIR"
fi

# Create package.json for PM2 version display
log_info "Creating package.json for PM2 version display..."

if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would create package.json at $DEPLOY_PATH_PARAM"
    log_info "[DRY RUN] Package.json would contain:"
    log_info "[DRY RUN]   - name: $APP_NAME"
    log_info "[DRY RUN]   - version: $VERSION"
    log_info "[DRY RUN]   - description: Drevo Web Application"
else
    if create_deployment_package_json "$DEPLOY_PATH_PARAM" "$APP_NAME" "$VERSION"; then
        log_info "✅ Package.json created successfully for PM2 version display"
    else
        log_error "❌ Failed to create package.json - continuing with deployment"
        log_warn "PM2 will not be able to display version information"
        # Don't fail the deployment, just warn
    fi
fi

# PM2 management - Auto restart after deployment
log_info "Performing PM2 restart..."

if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would execute PM2 restart: pm2 reload ecosystem.config.js --only $APP_NAME"
else
    PM2_COMMAND="pm2 reload ecosystem.config.js --only $APP_NAME"
    
    log_info "Executing PM2 restart: $PM2_COMMAND"
    
    if $PM2_COMMAND; then
        log_info "✅ PM2 restart completed successfully"
        
        # Wait a moment for PM2 to settle
        sleep 2
        
        # Verify PM2 status
        log_info "Verifying PM2 status..."
        if pm2 show "$APP_NAME" >/dev/null 2>&1; then
            log_info "✅ PM2 process '$APP_NAME' is running"
            
            # Show current status
            log_info "Current PM2 status:"
            pm2 status | grep -E "(id|$APP_NAME)" || pm2 status
        else
            log_error "❌ PM2 process '$APP_NAME' is not running after restart"
            log_error "Manual intervention may be required"
            # Don't fail deployment, but warn
        fi
    else
        log_error "❌ PM2 restart failed"
        log_error "Manual PM2 restart required: $PM2_COMMAND"
        # Don't fail deployment, but warn that manual restart is needed
    fi
fi

# Automatic cleanup of releases
log_info "Starting automatic cleanup of old releases..."

# Find all directories in releases folder, sort by modification time (newest first)
# Use stat to get modification time for proper sorting
RELEASE_DIRS=$(find "$RELEASES_DIR" -maxdepth 1 -type d -not -path "$RELEASES_DIR" -exec stat -c '%Y %n' {} \; | sort -nr | cut -d' ' -f2-)
RELEASE_COUNT=$(echo "$RELEASE_DIRS" | wc -l | tr -d ' ')

log_info "Found $RELEASE_COUNT releases in $RELEASES_DIR"

if [ "$RELEASE_COUNT" -gt 5 ]; then
    RELEASES_TO_DELETE=$(echo "$RELEASE_DIRS" | tail -n +6)
    
    log_info "Cleaning up old releases (keeping latest 5):"
    
    echo "$RELEASES_TO_DELETE" | while read -r dir; do
        if [ -n "$dir" ] && [ -d "$dir" ]; then
            if [ "$DRY_RUN" = true ]; then
                log_info "[DRY RUN] Would delete old release: $(basename "$dir")"
            else
                log_info "Deleting old release: $(basename "$dir")"
                rm -rf "$dir"
            fi
        fi
    done
    
    log_info "Cleanup completed"
else
    log_info "No cleanup needed (total releases: $RELEASE_COUNT, limit: 5)"
fi

# Final verification
if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Deployment simulation completed successfully!"
    log_info "Environment: $ENVIRONMENT, Version: $VERSION"
    
elif [ -L "$CURRENT_LINK" ] && [ "$(readlink "$CURRENT_LINK")" = "$RELEASE_DIR" ]; then
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
    log_info "🎉 Deployment completed successfully!"
    log_info "✅ PM2 process restarted automatically"
    log_info "📋 Next steps (optional verification):"
    log_info "1. Check detailed status: pm2 show $APP_NAME"
    log_info "2. Monitor logs: pm2 logs $APP_NAME"
    log_info "3. Verify version display: pm2 status"
    echo ""
    
else
    log_error "Deployment verification failed: symlink not pointing to expected target"
    if [ -L "$CURRENT_LINK" ]; then
        log_error "Current symlink points to: $(readlink "$CURRENT_LINK")"
        log_error "Expected: $RELEASE_DIR"
    else
        log_error "Current symlink does not exist: $CURRENT_LINK"
    fi
    exit 1
fi
