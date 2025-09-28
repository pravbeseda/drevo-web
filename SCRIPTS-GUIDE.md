# 🚀 Deployment & Development Scripts Guide

This guide explains the different scripts available for building, deploying, and running the Drevo Web application.

## 📁 Scripts Overview

### 🔧 Development Scripts

#### `scripts/dev-server.sh` - Local Development Server
**Purpose**: For local development and testing only

**Usage**:
```bash
# Start staging environment locally
./scripts/dev-server.sh staging

# Start production environment locally  
./scripts/dev-server.sh production

# Start at dev path locally
./scripts/dev-server.sh dev
```

**What it does**:
- Builds the application with appropriate base-href
- Starts a local development server
- Uses dynamic BASE_PATH configuration
- **NOT for production deployment**

---

### 🚀 Production Scripts

#### `scripts/deploy.sh` - Production Deployment
**Purpose**: Full production deployment with atomic symlinks, PM2 management, and versioning

**Usage**:
```bash
# New format (recommended)
./scripts/deploy.sh "1.2.0" "drevo-production" "~/releases/production-current" "production"
./scripts/deploy.sh "20240923-0900" "drevo-staging" "~/releases/staging-current" "staging"

# Legacy format (deprecated)
./scripts/deploy.sh staging "20240923-0900"
./scripts/deploy.sh production "1.2.0"

# Dry run mode
./scripts/deploy.sh "1.2.0" "drevo-production" "~/releases/production-current" "production" --dry-run
```

**What it does**:
- Atomic symlink deployment
- PM2 process management
- Version tracking
- Automatic cleanup of old releases
- Rollback capability
- **For production servers only**

---

### 📦 NPM Scripts

#### Build Scripts
```bash
# Build for different environments
npm run build:staging      # Build with /staging base-href
npm run build:prod         # Build with /new base-href  
npm run build              # Build with / base-href
```

#### Start Scripts  
```bash
# Start production servers
npm run start:prod         # Production with /new base-path
npm run start:staging      # Staging with /staging base-path
npm run start              # Dev with / base-path
```

---

## 🎯 When to Use Which Script

### Local Development & Testing
- **Use**: `./scripts/dev-server.sh [environment]`
- **For**: Testing different base-path configurations locally
- **Result**: Local server running on configured port

### Production Deployment
- **Use**: `./scripts/deploy.sh` with full parameters
- **For**: Deploying to staging/production servers
- **Result**: Atomic deployment with PM2 management

### Quick Local Builds
- **Use**: `npm run build:*` + `npm run start:*`
- **For**: Manual build and start process
- **Result**: More control over individual steps

---

## 🔧 Environment Configuration

Each environment uses different paths and ports:

| Environment | Base Path | Port | PM2 App Name |
|-------------|-----------|------|--------------|
| Staging     | /staging  | 4001 | drevo-staging |
| Production  | /new      | 4002 | drevo-production |
| Dev         | /         | 4000 | N/A |

---

## 📋 Quick Reference

```bash
# 🔧 LOCAL DEVELOPMENT
./scripts/dev-server.sh staging     # Test staging config locally
./scripts/dev-server.sh production  # Test production config locally
./scripts/dev-server.sh dev         # Test dev config locally

# Or using npm shortcuts
npm run dev:staging                 # = ./scripts/dev-server.sh staging
npm run dev:prod                    # = ./scripts/dev-server.sh production  
npm run dev                         # = ./scripts/dev-server.sh dev

# 🚀 PRODUCTION DEPLOYMENT  
./scripts/deploy.sh "1.2.0" "drevo-production" "~/releases/production-current" "production"
./scripts/deploy.sh "20240923-0900" "drevo-staging" "~/releases/staging-current" "staging"

# 📦 MANUAL BUILD + START
npm run build:prod && npm run start:prod
npm run build:staging && npm run start:staging
npm run build && npm run start
```

---

## ⚠️ Important Notes

- **dev-server.sh**: Development/testing only, runs locally
- **deploy.sh**: Production deployment only, uses atomic symlinks and PM2
- **npm scripts**: Individual steps, good for CI/CD pipelines
- Always use appropriate script for your use case to avoid confusion