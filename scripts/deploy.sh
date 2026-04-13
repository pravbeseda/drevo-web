#!/bin/bash

# Atomic deployment script for Drevo Web
# Usage: ./deploy.sh <version> <app_name> <deploy_path> <environment>
# Example: ./deploy.sh "20240923-0900" "drevo-beta" "~/releases/beta-current" "beta"
# Example: ./deploy.sh "1.2.0" "drevo-release" "~/releases/release-current" "release"

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

# Argument validation
if [ $# -eq 4 ]; then
    VERSION="$1"
    APP_NAME="$2"
    DEPLOY_PATH_PARAM="$3"
    ENVIRONMENT="$4"
    DRY_RUN=false

    # Expand tilde in deploy path if needed
    DEPLOY_PATH_PARAM="${DEPLOY_PATH_PARAM/#\~/$HOME}"

elif [ $# -eq 5 ] && [ "$5" = "--dry-run" ]; then
    VERSION="$1"
    APP_NAME="$2"
    DEPLOY_PATH_PARAM="$3"
    ENVIRONMENT="$4"
    DRY_RUN=true

    # Expand tilde in deploy path if needed
    DEPLOY_PATH_PARAM="${DEPLOY_PATH_PARAM/#\~/$HOME}"

else
    log_error "Usage: $0 <version> <app_name> <deploy_path> <environment> [--dry-run]"
    log_error "  Version: Version string (e.g., '1.2.0' or '260412-1430')"
    log_error "  App Name: PM2 app name (e.g., 'drevo-beta' or 'drevo-release')"
    log_error "  Deploy Path: Deployment directory path (e.g., '~/releases/beta-current')"
    log_error "  Environment: Environment name (e.g., 'beta', 'release', 'production')"
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
if [[ ! "$ENVIRONMENT" =~ ^[a-z][a-z0-9-]*$ ]]; then
    log_error "Environment must be lowercase alphanumeric with dashes, got: $ENVIRONMENT"
    exit 1
fi

# Validate app name format
if [[ ! "$APP_NAME" =~ ^drevo-[a-z0-9-]+$ ]]; then
    log_error "App name must match drevo-*, got: $APP_NAME"
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

# Ensure node/pm2 are in PATH for non-interactive SSH sessions (e.g. nvm)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    log_info "Loading nvm for non-interactive shell..."
    export NVM_DIR="$HOME/.nvm"
    # shellcheck source=/dev/null
    . "$NVM_DIR/nvm.sh"
fi

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
        # Must remove destination first: cp -P only prevents source dereference,
        # but still follows destination symlinks. If PREVIOUS_LINK points to a
        # directory, cp would copy INTO it instead of replacing the symlink.
        rm -f "$PREVIOUS_LINK"
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

# Verify node and pm2 are available before proceeding
if ! command -v node >/dev/null 2>&1; then
    log_error "node is not available in PATH"
    log_error "Ensure Node.js is installed and accessible in non-interactive shells"
    exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
    log_error "pm2 is not available in PATH"
    log_error "Ensure PM2 is installed globally: npm install -g pm2"
    exit 1
fi

log_info "Using node $(node -v) from $(command -v node)"
log_info "Using pm2 $(pm2 -v) from $(command -v pm2)"

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

            # Save PM2 process list for auto-restart after server reboot
            log_info "Saving PM2 process list..."
            if pm2 save; then
                log_info "✅ PM2 process list saved successfully"
                log_info "Application will auto-restart after server reboot"
            else
                log_warn "⚠️ Failed to save PM2 process list"
                log_warn "Application may not auto-restart after server reboot"
            fi
        else
            log_error "❌ PM2 process '$APP_NAME' is not running after restart"
            log_error "Manual intervention may be required"
            exit 1
        fi
    else
        log_error "❌ PM2 restart failed"
        log_error "Manual PM2 restart required: $PM2_COMMAND"
        exit 1
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
    log_info "✅ PM2 process list saved for auto-restart after server reboot"
    log_info "📋 Next steps (optional verification):"
    log_info "1. Check detailed status: pm2 show $APP_NAME"
    log_info "2. Monitor logs: pm2 logs $APP_NAME"
    log_info "3. Verify version display: pm2 status"
    log_info "4. Verify startup script: pm2 startup (should show current configuration)"
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
