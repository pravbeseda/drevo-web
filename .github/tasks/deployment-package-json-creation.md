# Deployment Package.json Creation Plan

## Overview

This plan implements automatic creation of `package.json` files during deployment to enable PM2 version display. The system will create environment-specific package.json files in deployment directories that PM2 can read to show version information in `pm2 status` and `pm2 show` commands.

## Requirements

### Functional Requirements
1. **Automatic Package.json Creation**: Create package.json with version during deployment
2. **Environment-Specific Naming**: Different app names for staging and production
3. **Version Injection**: Dynamic version based on deployment context
4. **PM2 Compatibility**: Format compatible with PM2 version detection
5. **Deployment Integration**: Seamless integration with existing deployment process

### Non-Functional Requirements
1. **Zero Downtime**: Package.json creation must not interfere with running processes
2. **Backward Compatibility**: Maintain existing deployment functionality
3. **Error Handling**: Graceful handling of file creation failures
4. **Validation**: Verify package.json creation and format

## Implementation Steps

### Step 1: Update Deployment Action
**File**: `.github/actions/deploy/action.yml`

#### Step 1.1: Add Version Input Parameter
- Add `version` input parameter to deployment action
- Make it required parameter (deployment action only receives version, never generates it)
- Add version format validation (SemVer or datetime format)
- Document parameter format and examples

#### Step 1.2: Prepare Deployment Parameters
- Determine app_name and deploy_path based on environment
- Pass version, app_name, and deploy_path to deployment script
- Single responsibility: parameter preparation and validation only

### Step 2: Update Deployment Script
**File**: `scripts/deploy.sh`

#### Step 2.1: Simplify Parameter Handling
- Accept validated parameters: version, app_name, deploy_path
- Remove parameter validation (already done in deployment action)
- Single responsibility: use provided parameters

#### Step 2.2: Create Package.json Generation Function
- Implement `create_deployment_package_json()` function
- Accept parameters: deployment_path, app_name, version
- Generate package.json with proper format for PM2
- Return success/failure status only

#### Step 2.3: Integrate into Deployment Flow
- Call package.json creation before PM2 restart
- Perform automatic PM2 restart after symlink update
- Verify PM2 process status after restart
- Single responsibility: orchestrate deployment steps

### Step 3: Update CI/CD Workflows

#### Step 3.1: Update Production Workflow
**File**: `.github/workflows/cd-production.yml`

- **ONLY PLACE for version generation**: Generate version from Git tags using `git describe --tags --abbrev=0`
- Pass generated version to deployment action
- Handle cases where no tags exist (fallback to commit hash)
- This is the single source of truth for production versions

#### Step 3.2: Update Staging Workflow  
**File**: `.github/workflows/cd-staging.yml`

- **ONLY PLACE for version generation**: Generate datetime-based version using `date +'%Y%m%d-%H%M'`
- Pass generated version to deployment action
- Ensure consistent version format
- This is the single source of truth for staging versions

### Step 4: Implementation Details

#### Step 4.1: Package.json Format
```json
{
  "name": "drevo-staging", // or "drevo-production"
  "version": "X.X.X",      // dynamic version
  "description": "Drevo Web Application"
}
```

#### Step 4.2: Deployment Directory Structure
```
/home/github-deploy/releases/staging-current/
├── server/
│   └── server.mjs
├── package.json          # <- Created during deployment
└── ... (other files)
```

#### Step 4.3: Version Flow
- **Single Source**: Version is generated only in CI/CD workflows
- **Parameter Passing**: Version flows: Workflow → Deployment Action → Deploy Script → Package.json
- **No Duplication**: Each component only receives and passes version, never generates it

## Deliverables

### Phase 1: Core Implementation
- Updated `.github/actions/deploy/action.yml` with version parameter
- Modified `scripts/deploy.sh` with package.json creation
- Package.json generation function with error handling

### Phase 2: CI/CD Integration
- Updated production workflow with Git tag version generation
- Updated staging workflow with datetime version generation
- Version parameter passing between workflows and deployment

### Phase 3: Testing & Validation
- Deployment script testing with different version formats
- PM2 version display verification
- Error handling and rollback scenarios

## Testing

### Essential Tests (Avoiding Duplication)
- **Package.json Generation Function**: Test with valid inputs, verify JSON format
- **End-to-End Deployment**: Test complete workflow → deployment → PM2 version display
- **Error Handling**: Test failure scenarios and graceful degradation

### Manual Testing Scenarios
1. **Production Deployment**:
   - Deploy with Git tag, verify package.json contains tag version
   - Check `pm2 status` shows correct version
   
2. **Staging Deployment**:
   - Deploy to staging, verify datetime version format
   - Check `pm2 status` shows datetime version
   
3. **Error Scenarios**:
   - Test deployment when package.json creation fails
   - Verify graceful fallback behavior
   
4. **Rollback Testing**:
   - Test package.json creation during rollback scenarios
   - Verify version consistency after rollback

## Implementation Script Examples

### Deployment Script Function
```bash
#!/bin/bash

create_deployment_package_json() {
    local deployment_path="$1"
    local app_name="$2"
    local version="$3"
    
    local package_json_path="${deployment_path}/package.json"
    
    # Create package.json content
    cat > "$package_json_path" << EOF
{
  "name": "$app_name",
  "version": "$version",
  "description": "Drevo Web Application"
}
EOF
    
    # Verify file creation
    if [[ -f "$package_json_path" ]]; then
        echo "✓ Created package.json with version $version at $package_json_path"
        return 0
    else
        echo "✗ Failed to create package.json at $package_json_path"
        return 1
    fi
}

# Simplified usage in deployment script
# All parameters are pre-validated and provided by deployment action
APP_VERSION="${1}"    # Pre-validated version
APP_NAME="${2}"       # Pre-determined app name (drevo-staging|drevo-production)  
DEPLOY_PATH="${3}"    # Pre-determined deployment path

# Simple validation that all required parameters are provided
if [[ -z "$APP_VERSION" || -z "$APP_NAME" || -z "$DEPLOY_PATH" ]]; then
    echo "ERROR: Missing required parameters. This script should be called from deployment action."
    echo "Usage: ./deploy.sh <version> <app_name> <deploy_path>"
    exit 1
fi

# Create package.json before PM2 restart
if create_deployment_package_json "$DEPLOY_PATH" "$APP_NAME" "$APP_VERSION"; then
    echo "Package.json created successfully, proceeding with PM2 restart..."
    # Continue with PM2 restart
else
    echo "Failed to create package.json, aborting deployment"
    exit 1
fi
```

### Workflow Version Generation
```yaml
# Production workflow
- name: Get version from Git tag
  id: version
  run: |
    VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo "0.0.0-$(git rev-parse --short HEAD)")
    echo "version=$VERSION" >> $GITHUB_OUTPUT

# Staging workflow  
- name: Generate datetime version
  id: version
  run: |
    VERSION=$(date +'%Y%m%d-%H%M')
    echo "version=$VERSION" >> $GITHUB_OUTPUT
```

## Risk Mitigation

### File System Permissions
- Ensure deployment user has write permissions to deployment directory
- Add permission checks before package.json creation
- Provide clear error messages for permission issues

### Concurrent Deployments
- Use atomic file operations to prevent race conditions
- Implement file locking if multiple deployments possible
- Add validation that package.json is properly formatted

### PM2 Cache Issues
- Consider PM2 cache invalidation after package.json creation
- Document PM2 restart requirements for version detection
- Add PM2 status verification after deployment

## Success Criteria

1. **Automated Creation**: Package.json is automatically created during every deployment
2. **Version Display**: PM2 status shows correct version for both environments
3. **Automatic PM2 Restart**: PM2 processes are automatically restarted after deployment
4. **No Manual Intervention**: Complete deployment without manual PM2 restart
5. **Error Recovery**: Deployment continues gracefully if PM2 restart fails
6. **Version Accuracy**: Displayed version matches deployment version in all cases

This focused plan can be implemented independently and will provide the foundation for PM2 version display functionality.