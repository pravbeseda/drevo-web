# 🚀 Deployment & Development Scripts Guide

This guide explains the different scripts available for building, deploying, and running the Drevo Web application.

## 📁 Scripts Overview

### 🚀 Production Scripts

#### `scripts/deploy.sh` - Production Deployment
**Purpose**: Full production deployment with atomic symlinks, PM2 management, and versioning

**Usage**:
```bash
# New format (recommended)
./scripts/deploy.sh "1.2.0" "drevo-production" "~/releases/production-current" "production"
./scripts/deploy.sh "20240923-0900" "drevo-staging" "~/releases/staging-current" "staging"

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
# Build for production (default)
npm run build              # Build with production configuration

# Build for development
npm run build:dev          # Build with development configuration
```

#### Start & Dev Scripts
```bash
# Start production server
npm run start              # Start the SSR server

# Local development
npm run dev                # Start Nx dev server with HMR
```

---

## 🎯 When to Use Which Script

### Local Development
- **Use**: `npm run dev`
- **For**: Active development with hot module replacement
- **Result**: Local dev server running on port 4200

### Production Deployment
- **Use**: `./scripts/deploy.sh` with full parameters
- **For**: Deploying to staging/production servers
- **Result**: Atomic deployment with PM2 management

### Manual Build & Test
- **Use**: `npm run build` + `npm run start`
- **For**: Testing production build locally
- **Result**: SSR server running on default port

---

## 🔧 Environment Configuration

Each environment uses different paths and ports:

| Environment | Base Path | Port | PM2 App Name |
|-------------|-----------|------|--------------|
| **Production** | `/` | 4002 | drevo-production |
| **Staging** | `/staging` | 4001 | drevo-staging |
| **Standalone** | `/` | 4010 | drevo-standalone |
| **Local dev** | `/` | 4200 | N/A |

---

## 📋 Quick Reference

```bash
# 🔧 LOCAL DEVELOPMENT
npm run dev                # Start dev server (http://localhost:4200)

# 🚀 PRODUCTION DEPLOYMENT  
./scripts/deploy.sh "1.2.0" "drevo-production" "~/releases/production-current" "production"
./scripts/deploy.sh "20240923-0900" "drevo-staging" "~/releases/staging-current" "staging"

# 📦 MANUAL BUILD + START
npm run build && npm run start
```

---

## ⚠️ Important Notes

- **deploy.sh**: Production deployment only, uses atomic symlinks and PM2
- **npm run dev**: For local development with HMR
- **npm run build + start**: For testing production SSR locally
- Staging uses `--base-href=/staging/` passed via CI/CD pipeline