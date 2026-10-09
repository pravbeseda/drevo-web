# 🚀 Deployment & Development Scripts Guide

This guide explains the different scripts available for building, deploying, and running the Drevo Web application.

## 📁 Scripts Overview

### 🚀 Production Scripts

#### `scripts/deploy.sh` - Production Deployment
**Purpose**: Full production deployment with atomic symlinks, PM2 management, and versioning

**Usage**:
```bash
# Examples
./scripts/deploy.sh "250413-1430" "drevo-beta" "~/releases/beta-current" "beta"
./scripts/deploy.sh "1.2.0" "drevo-release" "~/releases/release-current" "release"
./scripts/deploy.sh "1.2.0" "drevo-production" "~/releases/production-current" "production"

# Dry run mode
./scripts/deploy.sh "1.2.0" "drevo-release" "~/releases/release-current" "release" --dry-run
```

**What it does**:
- Atomic symlink deployment
- PM2 process management
- Version tracking
- Automatic cleanup of old releases
- Rollback capability
- **For production servers only**

---

### 📦 pnpm Scripts

#### Build Scripts
```bash
# Build for production (default)
pnpm build              # Build with production configuration

# Build for development
pnpm build:dev          # Build with development configuration
```

#### Start & Dev Scripts
```bash
# Start production server
pnpm start              # Start the SSR server

# Local development
pnpm serve                # Start Nx dev server with HMR
```

---

## 🎯 When to Use Which Script

### Local Development
- **Use**: `pnpm serve`
- **For**: Active development with hot module replacement
- **Result**: Local dev server running on port 4200

### Production Deployment
- **Use**: `./scripts/deploy.sh` with full parameters
- **For**: Deploying to staging/production servers
- **Result**: Atomic deployment with PM2 management

### Manual Build & Test
- **Use**: `pnpm build` + `pnpm start`
- **For**: Testing production build locally
- **Result**: SSR server running on default port

---

## 🔧 Environment Configuration

Each environment uses different paths and ports:

| Environment | Base Path | Port | PM2 App Name |
|-------------|-----------|------|--------------|
| **Production** (iframe) | `/` | 4002 | drevo-production |
| **Beta** | `/` | 4010 | drevo-beta |
| **Release** | `/` | 4011 | drevo-release |
| **Local dev** | `/` | 4200 | N/A |

---

## 📋 Quick Reference

```bash
# 🔧 LOCAL DEVELOPMENT
pnpm serve                # Start dev server (http://localhost:4200)

# 🚀 DEPLOYMENT  
./scripts/deploy.sh "250413-1430" "drevo-beta" "~/releases/beta-current" "beta"
./scripts/deploy.sh "1.2.0" "drevo-release" "~/releases/release-current" "release"

# 📦 MANUAL BUILD + START
pnpm build && pnpm start
```

---

## ⚠️ Important Notes

- **deploy.sh**: Production deployment only, uses atomic symlinks and PM2
- **pnpm serve**: For local development with HMR
- **pnpm build + start**: For testing production SSR locally
- Beta and release use `--base-href=/` passed via CI/CD pipeline