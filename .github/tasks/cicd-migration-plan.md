# CI/CD Migration Plan to Tag-Based Schema

## Overview

Migration from current schema (main → staging → production branches) to simplified schema (main branch + environments), where:
- `main` branch → automatic deployment to staging environment
- git tags → automatic deployment to production environment

## Current State

### Existing branches:
- `main` - development branch

### Existing workflows:
- `.github/workflows/main.yml` - main CI/CD pipeline
- `.github/workflows/deploy.yml` - reusable deployment workflow
- `.github/workflows/release.yml` - release management
- `.github/workflows/cleanup.yml` - branch cleanup

## Target Architecture

### New schema:
```
main branch ──────────────────► staging environment (beta.drevo-info.ru)
     │
     ▼
   git tag (v1.0.0) ──────────► production environment (drevo-info.ru)
```

### Server architecture:
- **Physical server**: one server for both environments
- **GitHub Deploy User**: dedicated `github-deploy` user with limited permissions
- **Production**: `drevo-info.ru` → `~/production` (relative to home directory)
- **Staging**: `beta.drevo-info.ru` → `~/staging` (relative to home directory)

### Workflow process:
1. **Development**: Work directly in `main` branch
2. **Staging deployment**: Every push to `main` → automatic deployment to `beta.drevo-info.ru`
3. **Production deployment**: Tag creation → automatic deployment to `drevo-info.ru`

## Implementation Plan

### Stage 1: Preparation
1. **Configure GitHub access to server**
   - Generate SSH keys for deployment
   - Add public key to server
   - Configure GitHub Secrets
   - Test SSH connection

2. **Create new workflow file structure**
   - `ci.yml` - Continuous Integration (testing)
   - `cd-staging.yml` - Continuous Deployment for staging
   - `cd-production.yml` - Deployment for production by tags

### Stage 2: Update workflows

#### 2.1 Create new CI workflow (`ci.yml`)
```yaml
name: Continuous Integration
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```
**Functions:**
- Lint, test, build on every push to main and PR
- Dependencies caching
- Nx affected for optimization
- Create artifacts for staging deployment (only on push to main)

#### 2.2 Create staging deployment workflow (`cd-staging.yml`)
```yaml
name: Deploy to Staging
on:
  push:
    branches: [main]
  workflow_run:
    workflows: ["Continuous Integration"]
    types: [completed]
    branches: [main]
```
**Functions:**
- Deploy only after successful CI
- Automatic deployment of every commit to main
- Health checks after deployment

#### 2.3 Create production deployment workflow (`cd-production.yml`)
```yaml
name: Deploy to Production
on:
  push:
    tags: ['v*']
```
**Functions:**
- Deploy only on semantic tags (v1.0.0, v1.2.3)
- GitHub Release creation
- Production health checks
- Rollback capability

### Stage 3: GitHub Configuration

#### 3.1 GitHub Environments
**Configure `staging` environment:**
- No protection rules (automatic deployment)
- Environment secrets: staging-related secrets
- Environment variables: `STAGING_URL`

**Configure `production` environment:**
- Protection rules:
  - Required reviewers: yourself (manual approval for production)
  - Deployment branches: Protected branches and tags only (`main`, `v*`)
- Environment secrets: production-related secrets  
- Environment variables: `PRODUCTION_URL`

#### 3.2 Branch Protection
- Configure protection rules for `main` branch
- Configure required status checks for CI

### Stage 4: Data Migration

#### 4.1 Branch synchronization
```bash
# Ensure main contains latest changes
git checkout main
git pull origin main
```

#### 4.2 Create initial tag
```bash
# Create tag for current main state
git tag v1.0.0 -m "Initial production release"
git push origin v1.0.0
```

### Stage 5: Testing

#### 5.1 Test staging deployment
```bash
# Make test commit to main
git checkout main
echo "# Test CI/CD" >> TEST_DEPLOY.md
git add TEST_DEPLOY.md
git commit -m "test: CI/CD pipeline migration"
git push origin main
# Check automatic staging deployment
```

#### 5.2 Test production deployment
```bash
# Create test tag
git tag v1.0.1
git push origin v1.0.1
# Check automatic production deployment
```

### Stage 6: Cleanup

#### 6.1 Clean up old workflow files
```bash
# Remove old workflow files if they exist
rm -f .github/workflows/main.yml
rm -f .github/workflows/deploy.yml  
rm -f .github/workflows/release.yml
rm -f .github/workflows/cleanup.yml
```

## Benefits of New Schema

- ✅ Work only with `main` branch - no merge operations
- ✅ Instant staging feedback on every commit  
- ✅ Simple tag-based production releases
- ✅ Better release traceability and automatic changelog
- ✅ Controlled production deployment process

## Monitoring and Alerts

Configure after migration: deployment notifications, health monitoring, uptime alerts.

## Rollback Plan

In case of problems: review and fix workflow configurations, check GitHub secrets and environment settings.

## Checklist

### Before migration:
- [ ] **Configure SSH access from GitHub to servers**
- [ ] Ensure all important changes are merged to main
- [ ] Verify project builds locally with `yarn build`

### During migration:
- [ ] Create new workflow files
- [ ] Configure GitHub Environments with protection rules
- [ ] Update branch protection rules
- [ ] Test staging deployment
- [ ] Test production deployment (including approval process)

### After migration:
- [ ] Update README.md with new schema
- [ ] Monitor first several deployments

## Detailed Instructions: SSH Access Configuration

## Monitoring and Alerts

After migration configure:
- Failed deployment notifications
- Health check monitoring
- Alerts for extended downtime
- Slack/Discord integration for team notifications

## Detailed Instructions: SSH Access Configuration

### 1. SSH Key Generation
```bash
# Create SSH key for deployment (without passphrase)
ssh-keygen -t ed25519 -C "github-deploy@drevo-info.ru" -f ~/.ssh/github_deploy_key -N ""

# Get public key
cat ~/.ssh/github_deploy_key.pub
```

### 2. Server Configuration

#### 2.1 Configure dedicated deployment user
```bash
# On server: create github-deploy user (if not already created)
sudo useradd -m -s /bin/bash github-deploy
sudo mkdir -p /home/github-deploy/.ssh
sudo mkdir -p /home/github-deploy/staging
sudo mkdir -p /home/github-deploy/production

# Add public key
sudo echo "PUBLIC_KEY" >> /home/github-deploy/.ssh/authorized_keys
sudo chmod 600 /home/github-deploy/.ssh/authorized_keys
sudo chmod 700 /home/github-deploy/.ssh
sudo chown -R github-deploy:github-deploy /home/github-deploy
```

### 3. GitHub Secrets Configuration

In GitHub Repository → Settings → Secrets and variables → Actions:

#### Required Secrets:
```
SSH_PRIVATE_KEY=private_key_content_from_github_deploy_key_file
SSH_KNOWN_HOSTS=ssh-keyscan_result_for_server
SSH_USER=github-deploy
SSH_HOST=drevo-info.ru
```

### 4. GitHub Variables Configuration

In GitHub Repository → Settings → Secrets and variables → Actions → Variables:

#### For staging environment:
```
STAGING_URL=https://beta.drevo-info.ru
```

#### For production environment:
```
PRODUCTION_URL=https://drevo-info.ru
```

### 5. SSH Connection Testing

```bash
# Test connection to server under github-deploy user
ssh -i ~/.ssh/github_deploy_key github-deploy@drevo-info.ru "echo 'SSH connection OK'"

# Test file creation in staging directory (relative path)
ssh -i ~/.ssh/github_deploy_key github-deploy@drevo-info.ru "touch staging/test_staging.txt"

# Test file creation in production directory (relative path)
ssh -i ~/.ssh/github_deploy_key github-deploy@drevo-info.ru "touch production/test_production.txt"
```

### 6. Create Deploy Directories on Server

```bash
# On server (execute once from root or sudo user)
sudo mkdir -p /home/github-deploy/staging
sudo mkdir -p /home/github-deploy/production
sudo chown github-deploy:github-deploy /home/github-deploy/staging
sudo chown github-deploy:github-deploy /home/github-deploy/production
chmod 755 /home/github-deploy/staging
chmod 755 /home/github-deploy/production

# Or, if already logged in as github-deploy:
# mkdir -p ~/staging ~/production
```

### Example Values:

#### Required Secrets:
```bash
# SSH_PRIVATE_KEY (private key file contents)
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAlwAAAAdzc2gtcn...
-----END OPENSSH PRIVATE KEY-----

# SSH_KNOWN_HOSTS
drevo-info.ru ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGq...

# SSH_USER
github-deploy

# SSH_HOST
drevo-info.ru
```

#### Variable Values:
```bash
# STAGING_URL
https://beta.drevo-info.ru

# PRODUCTION_URL
https://drevo-info.ru
```