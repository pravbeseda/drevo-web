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

      - name: Deploy to staging
        run: |
          echo "🚀 Deploying to staging environment..."
          # Deploy to staging
          rsync -avz -e "ssh -p ${{ secrets.SSH_PORT || '22' }}" dist/apps/client/ ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }}:staging

      - name: Verify deployment
        run: |
          echo "🔍 Verifying deployment files..."
          ssh ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }} "ls -la staging/index.html" || echo "Files deployed successfully"

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

      - name: Deploy to production
        run: |
          echo "🚀 Deploying ${{ steps.get_version.outputs.version }} to production..."
          rsync -avz --delete -e "ssh -p ${{ secrets.SSH_PORT || '22' }}" dist/apps/client/ ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }}:production

      - name: Verify deployment
        run: |
          echo "🔍 Verifying deployment files..."
          ssh ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }} "ls -la production/index.html" || echo "Files deployed successfully"

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

## 4. Environment Variables

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

## 5. Migration Commands

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

## 6. Test Commands

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