# Atomic Deployment System Documentation

## 🏗️ Architecture Overview

The Drevo Web project uses an atomic deployment system that ensures zero-downtime deployments through versioned releases and symlink switching. This architecture provides reliability, easy rollbacks, and clean separation between different deployment environments.

### Server Directory Structure

```
/home/github-deploy/
├── releases/
│   ├── staging/
│   │   ├── 20240923-0900/     # Format: YYYYMMDD-HHMM
│   │   ├── 20240923-1430/
│   │   └── 20240923-1630/
│   └── production/
│       ├── 1.0.0/             # Semantic version from git tag (without 'v' prefix)
│       ├── 1.0.1/
│       └── 1.1.0/
├── current-staging -> releases/staging/20240923-1630/
├── current-production -> releases/production/1.1.0/
├── previous-staging -> releases/staging/20240923-1430/
├── previous-production -> releases/production/1.0.1/
├── logs/
│   ├── staging-combined.log
│   ├── staging-out.log
│   ├── staging-error.log
│   ├── production-combined.log
│   ├── production-out.log
│   └── production-error.log
├── deploy.sh                  # Deployment script (copied from repository)
├── ecosystem.config.js        # PM2 configuration (copied from repository)
├── staging/                   # Legacy folders (to be removed manually)
└── production/                # Legacy folders (to be removed manually)
```

### How Atomic Deployment Works

1. **Versioned Releases**: Each deployment creates a new versioned directory in `releases/`
2. **Symlink Switching**: The `current-{environment}` symlink points to the active release
3. **Atomic Operation**: Symlink switching is atomic, ensuring zero downtime
4. **Rollback Support**: Previous symlink is saved for quick rollbacks
5. **Auto-cleanup**: Old releases are automatically cleaned up (keeps latest 5)

## 📋 Management Commands

### Deployment Commands

```bash
# Deploy to staging (format: YYYYMMDD-HHMM)
./deploy.sh staging 20240923-0900

# Deploy to production (format: X.Y.Z)
./deploy.sh production 1.2.0
```

### Rollback Commands

```bash
# Quick rollback to previous version (staging)
ln -sfn $(readlink ~/previous-staging) ~/current-staging
pm2 reload ecosystem.config.js --only drevo-staging

# Quick rollback to previous version (production)
ln -sfn $(readlink ~/previous-production) ~/current-production
pm2 reload ecosystem.config.js --only drevo-production

# Manual rollback to specific version
ln -sfn ~/releases/staging/20240923-1430 ~/current-staging
pm2 reload ecosystem.config.js --only drevo-staging
```

### Release Management

```bash
# View all staging releases
ls -la ~/releases/staging/

# View all production releases
ls -la ~/releases/production/

# Check current active releases
ls -la ~/current-*

# View release history with details
find ~/releases -type d -name "*" | sort
```

### PM2 Management

```bash
# Check PM2 status
pm2 status

# Reload specific environment
pm2 reload ecosystem.config.js --only drevo-staging
pm2 reload ecosystem.config.js --only drevo-production

# View logs
pm2 logs drevo-staging
pm2 logs drevo-production

# Monitor processes
pm2 monit

# Restart all processes
pm2 restart ecosystem.config.js
```

## 📊 Monitoring and Health Checks

### Check Current Status

```bash
# View current symlinks
ls -la ~/current-*

# Check if symlinks are valid
readlink ~/current-staging
readlink ~/current-production

# Verify deployment integrity
ls -la ~/current-staging/server/server.mjs
ls -la ~/current-production/server/server.mjs
```

### Log Monitoring

```bash
# View deployment logs
tail -f ~/logs/staging-combined.log
tail -f ~/logs/production-combined.log

# Check error logs
tail -f ~/logs/staging-error.log
tail -f ~/logs/production-error.log

# Monitor PM2 logs
pm2 logs --lines 50
```

### System Monitoring

```bash
# Check disk usage
df -h
du -sh ~/releases/*

# Monitor processes
ps aux | grep node

# Check memory usage
free -h

# Monitor network
netstat -tlnp | grep :400
```

## 🚨 Troubleshooting Guide

### Common Issues and Solutions

#### 1. Deployment Fails with "Release directory does not exist"

**Problem**: The release directory wasn't created properly.

**Solution**:
```bash
# Check if releases directory exists
ls -la ~/releases/

# Create missing directories
mkdir -p ~/releases/staging
mkdir -p ~/releases/production

# Re-run deployment
```

#### 2. Symlink Points to Wrong Directory

**Problem**: Current symlink is broken or points to wrong release.

**Solution**:
```bash
# Check current symlink
ls -la ~/current-staging

# Fix broken symlink manually
ln -sfn ~/releases/staging/YYYYMMDD-HHMM ~/current-staging

# Reload PM2
pm2 reload ecosystem.config.js --only drevo-staging
```

#### 3. PM2 Process Not Starting

**Problem**: PM2 process fails to start after deployment.

**Solution**:
```bash
# Check PM2 status
pm2 status

# Check logs for errors
pm2 logs drevo-staging --lines 50

# Restart process
pm2 restart drevo-staging

# If still failing, check node version and dependencies
node --version
ls -la ~/current-staging/node_modules/
```

#### 4. Server Build Missing

**Problem**: `server/server.mjs` not found in release directory.

**Solution**:
```bash
# Check build contents
ls -la ~/releases/staging/YYYYMMDD-HHMM/

# Verify build was created properly in CI/CD
# Re-run deployment from GitHub Actions
```

#### 5. Permission Issues

**Problem**: Permission denied errors during deployment.

**Solution**:
```bash
# Check file permissions
ls -la ~/deploy.sh
ls -la ~/ecosystem.config.js

# Fix permissions
chmod +x ~/deploy.sh
chmod 644 ~/ecosystem.config.js

# Check directory permissions
chmod 755 ~/releases/
```

#### 6. Out of Disk Space

**Problem**: Server runs out of disk space due to old releases.

**Solution**:
```bash
# Check disk usage
df -h
du -sh ~/releases/*/*

# Manual cleanup (keeps latest 3 instead of 5)
cd ~/releases/staging
ls -t | tail -n +4 | xargs rm -rf

cd ~/releases/production  
ls -t | tail -n +4 | xargs rm -rf
```

### Emergency Procedures

#### Complete Rollback to Legacy System

If the new atomic deployment system fails completely:

```bash
# Stop PM2 processes
pm2 stop all

# Remove current symlinks
rm ~/current-staging ~/current-production

# Point back to legacy directories (if they exist)
ln -sfn ~/staging ~/current-staging
ln -sfn ~/production ~/current-production

# Update PM2 configuration to use legacy paths temporarily
# Edit ecosystem.config.js or use legacy PM2 setup

# Restart PM2
pm2 start ecosystem.config.js
```

#### Emergency Disk Cleanup

```bash
# Emergency cleanup - remove all but latest release
cd ~/releases/staging && ls -t | tail -n +2 | xargs rm -rf
cd ~/releases/production && ls -t | tail -n +2 | xargs rm -rf

# Clear logs if needed
> ~/logs/staging-combined.log
> ~/logs/production-combined.log
```

## 📚 Additional Resources

### Configuration Files

- `scripts/deploy.sh` - Main deployment script
- `scripts/ecosystem.config.js` - PM2 configuration
- `.github/actions/deploy/action.yml` - GitHub Actions deployment action
- `.github/workflows/cd-staging.yml` - Staging deployment workflow
- `.github/workflows/cd-production.yml` - Production deployment workflow

### Environment Variables

The system uses the following environment variables in PM2:

**Staging**:
- `NODE_ENV=staging`
- `PORT=4001`

**Production**:
- `NODE_ENV=production`
- `PORT=4002`

### Version Formats

- **Staging**: `YYYYMMDD-HHMM` (e.g., `20240923-1430`)
- **Production**: `X.Y.Z` (semantic versioning, e.g., `1.2.0`)

### GitHub Secrets Required

- `SSH_PRIVATE_KEY` - SSH private key for deployment
- `SSH_KNOWN_HOSTS` - SSH known hosts
- `SSH_USER` - SSH username
- `SSH_HOST` - SSH hostname
- `SSH_PORT` - SSH port (optional, defaults to 22)

### Useful Commands Reference

```bash
# Quick status check
pm2 status && ls -la ~/current-*

# Full system check
./deploy.sh staging $(date +'%Y%m%d-%H%M') --dry-run

# Log monitoring
tail -f ~/logs/staging-combined.log ~/logs/production-combined.log

# Emergency stop
pm2 stop all

# Emergency start
pm2 start ecosystem.config.js
```

This documentation should be updated as the system evolves and new features are added.