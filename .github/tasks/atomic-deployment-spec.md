# Technical Specification: Atomic Deployment for Drevo Web

## 🎯 Project Goal
Implement secure atomic deployment with release versioning for Angular SSR application, integrated with existing GitHub Actions infrastructure.

## 📋 Initial Data
- ✅ GitHub Secrets for SSH connection are configured
- ✅ Working workflows: `cd-staging.yml` and `cd-production.yml` 
- ✅ Existing deploy action copies to `staging/` and `production/` folders
- ✅ PM2 currently works with old implementation (DO NOT TOUCH until new schema is fully ready)

## 🏗️ Target Architecture on Server
```
/home/github-deploy/
├── releases/
│   ├── staging/
│   │   ├── 20240922-1430/     # Format: YYYYMMDD-HHMM
│   │   ├── 20240922-1500/
│   │   └── 20240922-1630/
│   └── production/
│       ├── 1.0.0/             # Semantic version from git tag (without 'v' prefix)
│       ├── 1.0.1/
│       └── 1.1.0/
├── staging-current -> releases/staging/20240922-1630/
├── production-current -> releases/production/1.1.0/
├── logs/
│   ├── staging-*.log
│   └── production-*.log
├── deploy.sh                  # Copied from scripts/ on each deployment
├── ecosystem.config.js        # Copied from scripts/ on each deployment
├── staging/                   # Old folders (user will delete manually)
└── production/                # Old folders (user will delete manually)
```

## 📝 Technical Specification

### 1. **scripts/deploy.sh** (in scripts folder of repository)
**Purpose**: Script for atomic deployment, executed ON SERVER after file copying

**Important**: Replaces existing `scripts/deploy.sh` file in repository

**Signature**: `./deploy.sh <environment> <version>`
- `environment`: `staging` or `production`
- `version`: `YYYYMMDD-HHMM` for staging, `X.Y.Z` for production

**Functionality**:
1. **Argument validation**:
   - Check environment correctness (staging|production)
   - Check version format: staging `^[0-9]{8}-[0-9]{4}$`, production `^[0-9]+\.[0-9]+\.[0-9]+$`

2. **Release readiness check**:
   - Folder `~/releases/{env}/{version}/` exists
   - Contains `server/server.mjs` file (build correctness check)

3. **Atomic symlink switching**:
   - Ensure required directories exist (`~/releases/{env}/`, `~/logs/`)
   - Save current symlink for rollback: `~/staging-previous` or `~/production-previous` (if current symlink exists)
   - Create temporary symlink: `~/{env}-current.tmp.$$`
   - Atomic move: `mv ~/{env}-current.tmp.$$ ~/{env}-current`

4. **PM2 management** (PREPARE BUT DO NOT EXECUTE):
   - Prepare commands for `pm2 reload ecosystem.config.js --only drevo-{env}`
   - Add to logs, but DO NOT EXECUTE yet

5. **Automatic cleanup of releases**:
   - Find all folders in `~/releases/{env}/`
   - Sort by creation time (newest first)
   - Delete all except last 5

6. **Logging**:
   - Timestamp for all operations
   - Colored output (green/red/yellow)
   - Detailed information for each step

**Reliability requirements**:
- `set -euo pipefail`
- Error handling with detailed messages
- Input data validation
- Dry-run mode capability

### 2. **scripts/ecosystem.config.js** (in scripts folder of repository)
**Purpose**: PM2 configuration for both environments, ready to work through symlinks

**Structure**:
```javascript
module.exports = {
  apps: [
    {
      name: 'drevo-staging',
      script: './server/server.mjs',
      cwd: '/home/github-deploy/staging-current',
      env: {
        NODE_ENV: 'staging',
        PORT: 4001
      },
      instances: 'max',
      exec_mode: 'cluster',
      // Logging
      log_file: '/home/github-deploy/logs/staging-combined.log',
      out_file: '/home/github-deploy/logs/staging-out.log',
      error_file: '/home/github-deploy/logs/staging-error.log',
      // Graceful restart settings
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
      // Performance settings
      max_restarts: 5,
      min_uptime: '10s',
      max_memory_restart: '512M',
      // Auto-restart settings
      autorestart: true,
      // Process monitoring
      pmx: true,
      // File watching (disabled in production)
      ignore_watch: ['node_modules', 'logs', '.git'],
      // Node.js arguments
      node_args: '--max-old-space-size=512'
    },
    {
      name: 'drevo-production',
      script: './server/server.mjs', 
      cwd: '/home/github-deploy/production-current',
      env: {
        NODE_ENV: 'production',
        PORT: 4002
      },
      instances: 'max',
      exec_mode: 'cluster',
      // Logging
      log_file: '/home/github-deploy/logs/production-combined.log',
      out_file: '/home/github-deploy/logs/production-out.log',
      error_file: '/home/github-deploy/logs/production-error.log',
      // Graceful restart settings
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
      // Performance settings (higher limits for production)
      max_restarts: 3,
      min_uptime: '30s',
      max_memory_restart: '1G',
      // Auto-restart settings
      autorestart: true,
      // Process monitoring
      pmx: true,
      // File watching (disabled in production)
      ignore_watch: ['node_modules', 'logs', '.git'],
      // Node.js arguments
      node_args: '--max-old-space-size=1024'
    }
  ]
}
```

### 3. **Modification of .github/actions/deploy/action.yml**
**New inputs**:
- `version`: Release version (required parameter)

**Modified deployment logic**:
```bash
# Current behavior:
rsync ... source-path/ user@host:target-path/

# New behavior:
# 1. Copy service files from scripts/
scp scripts/deploy.sh scripts/ecosystem.config.js user@host:~/

# 2. Create versioned folder
ssh user@host "mkdir -p ~/releases/{environment}/{version}/"

# 3. Copy artifacts to versioned folder  
rsync ... source-path/ user@host:releases/{environment}/{version}/

# 4. Run deployment
ssh user@host "./deploy.sh {environment} {version}"
```

**Updated steps**:
1. Setup SSH (no changes)
2. Copy deployment scripts from scripts/ directory
3. Create release directory
4. Deploy files to versioned directory
5. Execute deployment script  
6. Verify deployment (check symlink)

### 4. **Modification of cd-production.yml**
**Minimal changes**:
- In step "Get version from tag" extract version WITHOUT 'v' prefix:
  ```bash
  echo "version=${GITHUB_REF_NAME#v}" >> $GITHUB_OUTPUT
  ```
- Pass `version` to deploy action:
  ```yaml
  with:
    version: ${{ steps.get_version.outputs.version }}
  ```

### 5. **Staging workflow** (assumes existence of cd-staging.yml)
**Version generation for staging**:
```bash
echo "version=$(date +'%Y%m%d-%H%M')" >> $GITHUB_OUTPUT
# This generates format like: 20240923-0900 (9:00 AM) or 20240923-1430 (2:30 PM)
```

### 6. **Documentation** (README-deployment.md)
**Sections**:

**6.1 Architecture**:
- Server folder schema
- Atomic deployment working principle
- Role of symlinks in zero-downtime deployment

**6.2 Management commands**:
```bash
# Deploy
./deploy.sh staging 20240922-1430
./deploy.sh production 1.2.0

# Rollback to previous version
ln -sfn $(readlink ~/staging-previous) ~/staging-current
pm2 reload ecosystem.config.js --only drevo-staging

# View releases
ls -la ~/releases/staging/
ls -la ~/releases/production/
```

**6.3 Monitoring**:
- PM2 commands: `pm2 status`, `pm2 logs drevo-staging`
- Check symlinks: `ls -la ~/staging-current ~/production-current`
- Deployment logs in `~/.pm2/logs/`

**6.4 Troubleshooting**:
- Permission issues
- Symlink problems  
- PM2 processes not restarting
- Rollback to working version

## 🔍 Testing Plan

### Preparatory tests (without PM2):
1. **File creation**: scripts/deploy.sh (replace existing), scripts/ecosystem.config.js
2. **Action modification**: check copying from scripts/ to versioned folders
3. **Test deploy.sh**: 
   - Argument validation
   - Symlink creation
   - Release cleanup
4. **Staging workflow**: YYYYMMDD-HHMM version generation
5. **Production workflow**: version extraction from tag

### Integration tests (after readiness):
1. Push to staging → check folder `~/releases/staging/YYYYMMDD-HHMM/`
2. Git tag → check folder `~/releases/production/X.Y.Z/`
3. Multiple deployments → check auto-cleanup
4. Manual rollback test

## ⚠️ Limitations and Requirements

### Limitations:
- **DO NOT TOUCH** existing PM2 configuration until full readiness
- **DO NOT DELETE** folders `~/staging/` and `~/production/` (user will do it manually)
- **DO NOT CHANGE** existing secrets and variables

### Security requirements:
- All SSH operations through existing configured keys
- Atomic operations to prevent partial deployment
- Validation of all input parameters
- Detailed logging for debugging

### Compatibility:
- Work with existing workflows
- Preserve all current functions (GitHub Releases, changelog)
- Gradual migration without downtime

## 📊 Readiness Criteria

### MVP (Minimal Viable Product):
- [ ] scripts/deploy.sh creates correct symlinks (replaces old file)
- [ ] scripts/ecosystem.config.js ready for use
- [ ] Deploy action copies files from scripts/ to versioned folders
- [ ] Workflows generate correct versions
- [ ] Auto-cleanup works
- [ ] Documentation ready

### Production Ready:
- [ ] PM2 integration (after MVP testing)
- [ ] Health checks (future iteration)
- [ ] Rollback automation (future iteration)

This specification ensures gradual implementation of atomic deployment with minimal risks for the existing system.