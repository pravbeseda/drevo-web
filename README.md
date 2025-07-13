# Drevo Web

Modern web application for Drevo project, built with Angular and Node.js. This is a gradual migration from the legacy Yii1 application.

## Project Structure

```
apps/
  client/          # Angular frontend application
  client-e2e/      # E2E tests with Playwright
legacy-drevo-yii/  # Legacy Yii1 application
libs/
  editor/          # Shared editor component
  shared/          # Shared utilities and types
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
```

### Available Commands

```bash
# Development server
yarn nx serve client

# Build
yarn nx build client

# Run tests
yarn nx test client          # Unit tests
yarn nx e2e client-e2e      # E2E tests

# Run linter
yarn nx lint client

# Check affected projects
yarn nx affected -t lint,test,build
```

## CI/CD Pipeline

The project uses GitHub Actions for CI/CD with three main branches:

- `main` - development branch
- `staging` - staging environment
- `production` - production environment

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

## Local CI/CD Testing

### Prerequisites

1. Install [nektos/act](https://github.com/nektos/act):
```bash
# macOS
brew install act

# Linux
curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

2. Install Docker (required for act)

### Running CI/CD Locally

Test specific workflow:
```bash
# Test the full pipeline (without deployment)
act -n  # Dry run, shows what would be executed
act    # Actually run the pipeline

# Test specific job
act -j build-and-test

# Test specific event
act pull_request  # Test PR workflow
act push         # Test push workflow
```

### Testing Different Branches

```bash
# Test staging deployment
git checkout staging
act push -s GITHUB_REF=refs/heads/staging

# Test production deployment
git checkout production
act push -s GITHUB_REF=refs/heads/production
```

Note: For security reasons, deployment jobs will be skipped locally as they require secrets. Only build, test, and lint stages will be executed.

### Testing with Secrets

1. Create a local secrets file:
```bash
cp .act.secrets.example .act.secrets
```

2. Edit `.act.secrets` with your test values (don't use real credentials!)

3. Run workflow with secrets:
```bash
# Test full workflow with secrets
act --secret-file .act.secrets

# Test specific job with secrets
act -j deploy-staging --secret-file .act.secrets

# Test with both secrets and environment variables
act push \
  --secret-file .act.secrets \
  -s GITHUB_REF=refs/heads/staging \
  -s GITHUB_SHA=$(git rev-parse HEAD)
```

### Local Testing Best Practices

1. Always use dummy credentials in `.act.secrets`
2. Never commit `.act.secrets` file (it's in .gitignore)
3. Use `-n` flag for dry-run before actual execution
4. Test one job at a time when debugging issues
5. Check Docker logs if actions fail unexpectedly

### Common Issues

1. If you see memory errors, you might need to increase Docker resources
2. Some actions might not work locally due to different runner environments
3. GitHub secrets are not available locally by default
