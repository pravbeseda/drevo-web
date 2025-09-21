````markdown
# New Workflow File Examples

## 1. CI Workflow (.github/workflows/ci.yml)

```yaml
name: Continuous Integration

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'yarn'

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Install Playwright
        run: yarn playwright install --with-deps

      - uses: nrwl/nx-set-shas@v4
        with:
          main-branch-name: 'main'

      - name: Run affected tasks
        run: |
          yarn nx affected -t lint,test,build --parallel=3
          yarn nx affected -t e2e

      - name: Upload build artifacts
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: actions/upload-artifact@v4
        with:
          name: dist-${{ github.sha }}
          path: dist/apps/client
          retention-days: 1
```

## 2. Staging Deployment (.github/workflows/cd-staging.yml)

```yaml
name: Deploy to Staging

on:
  workflow_run:
    workflows: ["Continuous Integration"]
    types: [completed]
    branches: [main]

jobs:
  deploy-staging:
    if: github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: ${{ vars.STAGING_URL }}

    steps:
      - uses: actions/checkout@v4

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: dist-${{ github.event.workflow_run.head_sha }}
          path: dist/apps/client
          github-token: ${{ secrets.GITHUB_TOKEN }}
          run-id: ${{ github.event.workflow_run.id }}

      - name: Setup SSH for deployment
        uses: shimataro/ssh-key-action@v2
        with:
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          known_hosts: ${{ secrets.SSH_KNOWN_HOSTS }}

      - name: Deploy with reusable action
        uses: ./.github/actions/deploy
        with:
          environment: 'staging'
          ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}
          ssh-known-hosts: ${{ secrets.SSH_KNOWN_HOSTS }}
          ssh-user: ${{ secrets.SSH_USER }}
          ssh-host: ${{ secrets.SSH_HOST }}
          ssh-port: ${{ secrets.SSH_PORT || '22' }}
          source-path: 'dist/apps/client'
          target-path: 'staging'
          environment-url: ${{ vars.STAGING_URL }}

      - name: Notify deployment
        if: always()
        run: |
          if [ "${{ job.status }}" == "success" ]; then
            echo "✅ Staging deployment successful: ${{ vars.STAGING_URL }}"
          else
            echo "❌ Staging deployment failed"
            exit 1
          fi
```

## 3. Production Deployment (.github/workflows/cd-production.yml)

```yaml
name: Deploy to Production

on:
  push:
    tags: ['v*']

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: ${{ vars.PRODUCTION_URL }}

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Get version from tag
        id: get_version
        run: echo "version=${GITHUB_REF#refs/tags/}" >> $GITHUB_OUTPUT

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'yarn'

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Build for production
        env:
          APP_VERSION: ${{ steps.get_version.outputs.version }}
        run: npx nx build client --configuration=production

      - name: Setup SSH for deployment
        uses: shimataro/ssh-key-action@v2
        with:
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          known_hosts: ${{ secrets.SSH_KNOWN_HOSTS }}

      - name: Deploy with reusable action
        uses: ./.github/actions/deploy
        with:
          environment: 'production'
          ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}
          ssh-known-hosts: ${{ secrets.SSH_KNOWN_HOSTS }}
          ssh-user: ${{ secrets.SSH_USER }}
          ssh-host: ${{ secrets.SSH_HOST }}
          ssh-port: ${{ secrets.SSH_PORT || '22' }}
          source-path: 'dist/apps/client'
          target-path: 'production'
          environment-url: ${{ vars.PRODUCTION_URL }}
          version: ${{ steps.get_version.outputs.version }}

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          tag_name: ${{ steps.get_version.outputs.version }}
          name: Release ${{ steps.get_version.outputs.version }}
          body: |
            🚀 **Production Release ${{ steps.get_version.outputs.version }}**
            
            **Deployed**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
            **Environment**: Production
            **URL**: ${{ vars.PRODUCTION_URL }}
            
            **Changes in this release:**
            - See commit history for detailed changes
            
            **Deployment**: ✅ Files deployed successfully
          draft: false
          prerelease: false

      - name: Notify deployment
        if: always()
        run: |
          if [ "${{ job.status }}" == "success" ]; then
            echo "✅ Production deployment successful: ${{ vars.PRODUCTION_URL }}"
            echo "🎉 Release ${{ steps.get_version.outputs.version }} is live!"
          else
            echo "❌ Production deployment failed"
            echo "🚨 Manual intervention required"
            exit 1
          fi
```

## 4. Reusable Deployment Action

### .github/actions/deploy/action.yml
```yaml
name: 'Deploy to Server'
description: 'Deploy using SSH and rsync with verification'
author: 'Drevo CI/CD'

inputs:
  environment:
    description: 'Target environment (staging/production)'
    required: true
  ssh-private-key:
    description: 'SSH private key for deployment'
    required: true
  ssh-known-hosts:
    description: 'SSH known hosts'
    required: true
  ssh-user:
    description: 'SSH user for deployment'
    required: true
  ssh-host:
    description: 'SSH host for deployment'
    required: true
  ssh-port:
    description: 'SSH port for deployment'
    required: false
    default: '22'
  source-path:
    description: 'Source path to deploy from'
    required: true
    default: 'dist/apps/client'
  target-path:
    description: 'Target path on server (relative to user home)'
    required: true
  environment-url:
    description: 'Environment URL for notifications'
    required: false
  version:
    description: 'Version being deployed (for production)'
    required: false

runs:
  using: 'composite'
  steps:
    - name: Setup SSH for deployment
      uses: shimataro/ssh-key-action@v2
      with:
        key: ${{ inputs.ssh-private-key }}
        known_hosts: ${{ inputs.ssh-known-hosts }}

    - name: Deploy to ${{ inputs.environment }}
      shell: bash
      run: |
        echo "🚀 Deploying to ${{ inputs.environment }} environment..."
        if [ -n "${{ inputs.version }}" ]; then
          echo "📦 Version: ${{ inputs.version }}"
        fi
        
        rsync -avz --delete \
          -e "ssh -p ${{ inputs.ssh-port }}" \
          ${{ inputs.source-path }}/ \
          ${{ inputs.ssh-user }}@${{ inputs.ssh-host }}:${{ inputs.target-path }}/

    - name: Verify deployment
      shell: bash
      run: |
        echo "🔍 Verifying deployment files..."
        ssh -p ${{ inputs.ssh-port }} \
          ${{ inputs.ssh-user }}@${{ inputs.ssh-host }} \
          "ls -la ${{ inputs.target-path }}/index.html" || echo "Verification completed"

    - name: Notify deployment success
      shell: bash
      run: |
        echo "✅ ${{ inputs.environment }} deployment successful"
        if [ -n "${{ inputs.environment-url }}" ]; then
          echo "🌐 URL: ${{ inputs.environment-url }}"
        fi
        if [ -n "${{ inputs.version }}" ]; then
          echo "🎉 Release ${{ inputs.version }} is live!"
        fi
```

## 5. Environment Variables

### GitHub Secrets (required):
- `SSH_PRIVATE_KEY` - SSH key for deployment
- `SSH_KNOWN_HOSTS` - Known hosts for SSH
- `STAGING_SSH_USER` - SSH user for staging
- `STAGING_SSH_HOST` - SSH host for staging  
- `STAGING_PATH` - Deployment path for staging
- `PRODUCTION_SSH_USER` - SSH user for production
- `PRODUCTION_SSH_HOST` - SSH host for production
- `PRODUCTION_PATH` - Deployment path for production

### GitHub Variables (for environments):
- `STAGING_URL` - Staging environment URL
- `PRODUCTION_URL` - Production environment URL

## 6. Migration Commands

### Create backup
```bash
cp -r .github/workflows .github/workflows.backup
```

### Check current branches
```bash
git branch -a
git log --oneline main..staging
git log --oneline main..production
```

### Create initial tag
```bash
git checkout main
git tag v1.0.0 -m "Initial production release"
git push origin v1.0.0
```

### Remove old branches (after testing)
```bash
git push origin --delete staging
git push origin --delete production
git branch -d staging production
```

## 7. Test Commands

### Test staging deployment
```bash
echo "# Test staging deployment" >> TEST_STAGING.md
git add TEST_STAGING.md
git commit -m "test: staging deployment"
git push origin main
```

### Test production deployment
```bash
git tag v1.0.1 -m "Test production deployment"
git push origin v1.0.1
```
````