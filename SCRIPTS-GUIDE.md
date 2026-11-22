# 🚀 Deployment & Development Scripts Guide

This guide explains the different scripts available for building, deploying, and running the Drevo Web application.

## 📁 Scripts Overview

### 🚀 Production Scripts

#### `scripts/deploy.sh` - Production Deployment
**Purpose**: Full production deployment with atomic symlinks, PM2 management, and versioning

**Usage**: CI copies it to `~/deploy.sh` on the server and runs it from `~`, where it finds `ecosystem.config.js`. The release directory `~/releases/<env>/<version>/` must already hold the build.
```bash
# Examples, on the server
cd ~
./deploy.sh "250413-1430" "drevo-beta" "~/releases/beta-current" "beta"
./deploy.sh "1.2.0" "drevo-release" "~/releases/release-current" "release"
./deploy.sh "1.2.0" "drevo-production" "~/releases/production-current" "production"

# Dry run mode
./deploy.sh "1.2.0" "drevo-release" "~/releases/release-current" "release" --dry-run
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
- **Use**: `~/deploy.sh` with full parameters
- **For**: Deploying beta, release and production (iframe) on the server
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

# 🚀 DEPLOYMENT (on the server, from ~)
./deploy.sh "250413-1430" "drevo-beta" "~/releases/beta-current" "beta"
./deploy.sh "1.2.0" "drevo-release" "~/releases/release-current" "release"

# 📦 MANUAL BUILD + START
pnpm build && pnpm start
```

---

## 🖥️ Server Runbook

All three apps run on one server under `github-deploy`. `<env>` is `beta`, `release` or `production`; the PM2 app is `drevo-<env>`.

### Layout

```
~/deploy.sh, ~/ecosystem.config.js   # overwritten by every deploy, from main or iframe
~/releases/<env>/<version>/          # one build per deploy: yymmdd-HHMM (beta), X.Y.Z (release, production)
~/releases/<env>-current             # active release, the PM2 cwd
~/releases/<env>-previous            # the release before it, for rollback
~/releases/<env>-prev-1 … prev-4     # beta, release: older builds kept so nginx serves their hashed assets to open tabs
~/logs/<env>-{combined,out,error}.log
```

A beta or release deploy keeps the five newest releases, plus any that a symlink above points at. Production deploys run the `iframe` branch's own `deploy.sh`: no `prev-N` ring, and it keeps the five newest releases by modification time only — after a rollback to an older production release, the next production deploy can delete it, and `production-previous` with it.

### Rollback

```bash
ENV=release   # beta | release | production
cd ~

# to the previous release
ln -sfn "$(readlink releases/$ENV-previous)" releases/$ENV-current

# or to a specific one; keep the target absolute, a relative one resolves inside releases/
ls -t releases/$ENV/
ln -sfn ~/releases/$ENV/<version> releases/$ENV-current

pm2 reload ecosystem.config.js --only drevo-$ENV && pm2 save
```

The next deploy of that environment replaces the rollback — for beta, the next push to `main`.

### Status and logs

```bash
pm2 status                       # the version column comes from each release's package.json
ls -l ~/releases/                # where every symlink points
pm2 logs drevo-$ENV --lines 50
tail -f ~/logs/$ENV-error.log
```

PM2 startup and `pm2 save`: [docs/pm2-setup.md](docs/pm2-setup.md). Server user, SSH key and GitHub settings: [docs/server-github-setup.md](docs/server-github-setup.md).

---

## ⚠️ Important Notes

- **deploy.sh**: Production deployment only, uses atomic symlinks and PM2
- **pnpm serve**: For local development with HMR
- **pnpm build + start**: For testing production SSR locally
