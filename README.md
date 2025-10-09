# Drevo Web

Modern web application for Drevo project, built with Angular and Node.js. This is a gradual migration from the legacy Yii1 application.

## Project Structure

```
apps/
  client/          # Angular frontend application
  client-e2e/     # E2E tests with Playwright
legacy-drevo-yii/  # Legacy Yii1 application
libs/
  editor/         # Shared editor component
  shared/         # Shared utilities and types
```

## Development

### Prerequisites

- Node.js 20+
- Yarn
- Playwright for E2E testing

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
# Development server
yarn nx serve client

# Build for different environments
npm run build:staging      # Build with /staging base-href
npm run build:prod         # Build with /new base-href  
npm run build              # Build with / base-href

# Local development servers
npm run dev                # Start dev server with / base-path
npm run dev:staging        # Start dev server with /staging base-path
npm run dev:prod           # Start dev server with /new base-path

# Production servers
npm run start              # Start production server with / base-path
npm run start:staging      # Start production server with /staging base-path
npm run start:prod         # Start production server with /new base-path

# Run tests
yarn nx test client          # Unit tests
yarn nx e2e client-e2e      # E2E tests
yarn nx affected -t lint     # Lint affected projects

# Check affected projects
yarn nx affected -t lint,test,build --parallel=3
```

> 📖 **For detailed information about deployment and development scripts, see [SCRIPTS-GUIDE.md](./SCRIPTS-GUIDE.md)**

## CI/CD Pipeline

The project uses GitHub Actions for CI/CD with three main branches:

- `main` - development branch
- `staging` - staging environment
- `production` - production environment

### Security Scanning

The project includes automated security scanning to prevent secrets from being committed:

- **Pre-commit hook**: Scans staged files before each commit
- **GitHub Actions**: Scans all commits on push and pull requests
- **Configuration**: See [docs/security-scanning.md](./docs/security-scanning.md) for details

### Workflow Stages

1. **Build and Test** (all branches)
   - Runs on every push and pull request
   - Installs dependencies
   - Runs linting
   - Runs unit tests
   - Runs E2E tests
   - Builds the application
   - Uses Nx affected to optimize build time

2. **Deploy to Staging** (staging branch)
   - Triggered on push to staging branch
   - Requires successful build and tests
   - Deploys to staging environment
   - Available at ${STAGING_URL}

3. **Deploy to Production** (production branch)
   - Triggered on push to production branch
   - Requires successful build and tests
   - Creates a new release version
   - Deploys to production environment
   - Available at ${PRODUCTION_URL}

### Version Management

- Uses semantic versioning
- Version tags are automatically created on production deployments
- Version can be bumped using commit messages:
  - `#major` - Major version bump
  - `#minor` - Minor version bump
  - Default is patch version bump

### Branch Protection

- Protected branches: `staging`, `production`
- Direct pushes are not allowed
- Required pull request reviews
- Required status checks must pass
- Feature branches are automatically deleted after merge

## Deployment

### Prerequisites

1. Set up GitHub repository secrets:
   - `SSH_PRIVATE_KEY`
   - `SSH_KNOWN_HOSTS`
   - `STAGING_SSH_USER`
   - `STAGING_SSH_HOST`
   - `STAGING_PATH`
   - `PRODUCTION_SSH_USER`
   - `PRODUCTION_SSH_HOST`
   - `PRODUCTION_PATH`

2. Set up GitHub environments:
   - `staging`
   - `production`

### Manual Deployment

```bash
# Build for production
yarn nx build client --configuration=production

# Deploy using deploy script
./scripts/deploy.sh /path/to/deploy environment
```
