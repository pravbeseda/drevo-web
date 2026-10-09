[![Unit](https://img.shields.io/endpoint?url=https://pravbeseda.github.io/drevo-web/badge.json)](https://pravbeseda.github.io/drevo-web/)
[![Playwright](https://img.shields.io/endpoint?url=https://pravbeseda.github.io/drevo-web/badge-integration.json)](https://pravbeseda.github.io/drevo-web/integration/index.html)

# Drevo-Web

Nx monorepo with Angular 22 application for the Drevo project. Gradual migration from a legacy Yii1 app to a modern stack

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Angular 22, RxJS 7.8, Angular Material 22 (M3) |
| State | Angular Signals |
| Editor | CodeMirror 6 |
| SSR | Express + Angular SSR |
| Unit Tests | Jest + Spectator |
| E2E Tests | Playwright |
| Styles | SCSS + Angular Material Theming |
| Monitoring | Sentry |
| Package Manager | pnpm |

## Project Structure

```
apps/
  client/                    # Main Angular application
    src/app/
      features/              # Feature modules (lazy-loaded)
        article/             # Article view, editing, versions
        auth/                # Authentication (login)
        editor/              # Collaborative editing (CodeMirror)
        history/             # Change history, diffs
        main/                # Home page
        search/              # Search
      services/              # Global domain services (articles, auth, links)
      shared/                # Code shared across features
        components/          # Shared components (error, filters, etc.)
        models/              # Cross-feature types
      interceptors/          # HTTP interceptors
      guards/                # Route guards
      layout/                # Layout shell (header, sidebar-nav, version-display)
    src/environments/        # Environment configs
  client-e2e/                # E2E tests (Playwright)

libs/
  core/                      # HTTP utilities, logging, notifications, DI tokens
    http/                    # HTTP utilities, error mapper
    logging/                 # IndexedDB + Sentry + Console logging
    services/                # NotificationService, SidebarService, StorageService
    tokens/                  # DI tokens (WINDOW, etc.)
    testing/                 # Test mocks (mockLoggerProvider, etc.)
  shared/                    # Shared models, types, helpers (cross-app)
    models/                  # User, Article, AuthState, etc.
    helpers/                 # URL, HTML, assert utilities
  editor/                    # CodeMirror 6 editor component
  ui/                        # UI component library (button, icon, spinner, modal, etc.)

legacy-drevo-yii/            # Symlink to legacy Yii1 backend
```

## Development

### Prerequisites

- Node.js 22.12+ (or 24+)
- pnpm — any install switches itself to the version pinned in `packageManager` (`npm install -g pnpm`)
- Playwright (for E2E testing)

### Installation

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install --with-deps

# Set up git hooks for security scanning
./scripts/setup-git-hooks.sh
```

### Available Commands

```bash
# Development server (localhost:4200)
pnpm serve

# Build
pnpm build                          # Production build
pnpm build:dev                      # Development build

# Tests
pnpm test                           # All unit tests
pnpm nx test client                 # Client unit tests
pnpm e2e                            # E2E tests
pnpm nx e2e client-e2e              # E2E tests (via Nx)

# Code quality
pnpm lint                           # ESLint (affected)
pnpm format:check                   # Prettier check
pnpm format:fix                     # Prettier fix

# Affected (CI)
pnpm nx affected -t lint,test,build
```

> For detailed information about deployment scripts, see [SCRIPTS-GUIDE.md](./SCRIPTS-GUIDE.md).

## CI/CD Pipeline

The project uses GitHub Actions for CI/CD.

### Branches

- **`main`** — default branch, active development. Push triggers beta deploy. Tag `X.Y.Z` triggers release deploy.
- `iframe` — frozen legacy (old Yii-era wrapper). CD is manual-only via `workflow_dispatch`. Hotfix tags: `iframe-X.Y.Z`.

### Workflows

| Workflow | File | Trigger |
|----------|------|---------|
| CI | `ci.yml` | Push & PR to all branches |
| Coverage | `coverage.yml` | After CI |
| Beta Deploy | `cd-main-beta.yml` | Push to `main` |
| Release Deploy | `cd-main-release.yml` | Tag `X.Y.Z` on `main` |
| Iframe Release | `cd-iframe-release.yml` | Manual (`workflow_dispatch`) |
| Security Scan | `security-scan.yml` | Push & PR |

### Security Scanning

Automated security scanning to prevent secrets from being committed:

- **Pre-commit hook** — scans staged files before each commit
- **GitHub Actions** — scans all commits on push and pull requests
- **Configuration** — see [docs/security-scanning.md](docs/security-scanning.md)

### Version Management

- **Beta**: date-based versions (`yymmdd-HHMM`), automatic on push to `main`
- **Release**: semantic versioning (`X.Y.Z`), triggered by git tag + GitHub Release

### Branch Protection

- Protected branch: `main` (required PR reviews, passing status checks)
- Feature branches deleted after merge

## Deployment

Atomic deployment via symlink switching, managed by PM2.

| PM2 App | Port | Role | Branch |
|---------|------|------|--------|
| `drevo-production` | 4002 | iframe release (legacy) | `iframe` |
| `drevo-beta` | 4010 | main beta (date version) | `main` |
| `drevo-release` | 4011 | main release (semver) | `main` tag `X.Y.Z` |

### Prerequisites

1. GitHub repository secrets: `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS`, `SSH_USER`, `SSH_HOST`, `SSH_PORT`
2. GitHub environments: `beta`, `release`, `production`

### Manual Deployment

```bash
# Build for production
pnpm build

# Deploy using deploy script
./scripts/deploy.sh <version> <pm2-app-name> <symlink-path> <environment>
```
