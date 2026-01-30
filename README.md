[![Coverage](https://img.shields.io/endpoint?url=https://pravbeseda.github.io/drevo-web/badge.json)](https://pravbeseda.github.io/drevo-web/)

# Drevo-Web

Nx monorepo with Angular 21 application for the Drevo project. Gradual migration from a legacy Yii1 app to a modern stack.

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Angular 21, RxJS 7.8, Angular Material 21 (M3) |
| State | Angular Signals |
| Editor | CodeMirror 6 |
| SSR | Express + Angular SSR |
| Unit Tests | Jest + Spectator |
| E2E Tests | Playwright |
| Styles | SCSS + Angular Material Theming |
| Monitoring | Sentry |
| Package Manager | Yarn |

## Project Structure

```
apps/
  client/                    # Main Angular application
    src/app/
      pages/                 # Pages (lazy-loaded)
        login/               # Authentication
        article/             # Article view
        article-edit/        # Article editing
        search/              # Search
        main/                # Home page
        shared-editor/       # Collaborative editing
        error/               # Error page
      services/              # Application services
      components/            # Reusable components
      interceptors/          # HTTP interceptors
      guards/                # Route guards
      layout/                # Layout (header, footer)
      models/                # Types
    src/environments/        # Environment configs
  client-e2e/                # E2E tests (Playwright)

libs/
  core/                      # Core: HTTP, logging, notifications
    http/                    # HTTP utilities, error mapper
    logging/                 # IndexedDB + Sentry + Console logging
    services/                # NotificationService, SidebarService, StorageService
  shared/                    # Shared models, types, helpers
    models/                  # User, Article, AuthState, etc.
    helpers/                 # URL, HTML, assert utilities
  editor/                    # CodeMirror 6 editor component
  ui/                        # UI component library (button, icon, spinner, modal, etc.)

legacy-drevo-yii/            # Symlink to legacy Yii1 backend
```

## Development

### Prerequisites

- Node.js 20+
- Yarn
- Playwright (for E2E testing)

### Installation

```bash
# Install dependencies
yarn install

# Install Playwright browsers
yarn playwright install --with-deps

# Set up git hooks for security scanning
./scripts/setup-git-hooks.sh
```

### Available Commands

```bash
# Development server (localhost:4200)
yarn dev

# Build
yarn build                          # Production build
yarn build:dev                      # Development build

# Tests
yarn test                           # All unit tests
yarn nx test client                 # Client unit tests
yarn e2e                            # E2E tests
yarn nx e2e client-e2e              # E2E tests (via Nx)

# Code quality
yarn lint                           # ESLint (affected)
yarn format:check                   # Prettier check
yarn format:fix                     # Prettier fix

# Affected (CI)
yarn nx affected -t lint,test,build
```

> For detailed information about deployment scripts, see [SCRIPTS-GUIDE.md](./SCRIPTS-GUIDE.md).

## CI/CD Pipeline

The project uses GitHub Actions for CI/CD.

### Branches

- **`standalone`** — default branch, active development of the standalone Angular application
- `main` — frozen, iframe-based editor embedded in the legacy Yii1 app
- `staging` — frozen, staging deployment of the iframe version

### Workflows

| Workflow | File | Trigger |
|----------|------|---------|
| CI | `ci.yml` | Push & PR to all branches |
| Coverage | `coverage.yml` | After CI |
| Staging Deploy | `cd-staging.yml` | Push to `staging` |
| Production Deploy | `cd-production.yml` | Push to `production` |
| Standalone Build | `standalone.yml` | Manual |
| Security Scan | `security-scan.yml` | Push & PR |

### Security Scanning

Automated security scanning to prevent secrets from being committed:

- **Pre-commit hook** — scans staged files before each commit
- **GitHub Actions** — scans all commits on push and pull requests
- **Configuration** — see [docs/security-scanning.md](./docs/security-scanning.md)

### Version Management

- Semantic versioning with automatic tags on production deployments
- Version bump via commit messages: `#major`, `#minor`, default is patch

### Branch Protection

- Protected branches: `stanalone`, `staging`, `main`
- Required pull request reviews and passing status checks
- Feature branches deleted after merge

## Deployment

Atomic deployment via symlink switching, managed by PM2.

### Prerequisites

1. GitHub repository secrets:
   - `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS`
   - `STAGING_SSH_USER`, `STAGING_SSH_HOST`, `STAGING_PATH`
   - `PRODUCTION_SSH_USER`, `PRODUCTION_SSH_HOST`, `PRODUCTION_PATH`

2. GitHub environments: `staging`, `production`

### Manual Deployment

```bash
# Build for production
yarn build

# Deploy using deploy script
./scripts/deploy.sh /path/to/deploy environment
```
