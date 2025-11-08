# GitHub Secrets Migration: Repository → Environment

## 🎯 Current Situation.

Currently, secrets are configured as **Repository secrets** - they are shared across all environments.
For separate deployment to different servers, you need to migrate them to **Environment secrets**.

## 📋 Difference Between Secret Types

| Repository Secrets | Environment Secrets |
|-------------------|---------------------|
| Shared across the entire repository | Unique for each environment |
| Used in all workflows | Only used in jobs with specified `environment:` |
| `Settings → Secrets and variables → Actions` | `Settings → Environments → [select environment] → Secrets` |

## ✅ Migration Plan

### Step 1: Check Current Repository Secrets

**Path**: `Settings → Secrets and variables → Actions → Secrets`

You should see:
- `SSH_PRIVATE_KEY`
- `SSH_KNOWN_HOSTS`
- `SSH_USER`
- `SSH_HOST`
- `SSH_PORT` (possibly)

**Important**: Note the secret names, but values **cannot be viewed**. If you don't remember the values, they will need to be recreated.

### Step 2: Create Environment Secrets for PRODUCTION

**Path**: `Settings → Environments → production`

1. Scroll to the **Environment secrets** section
2. Click **Add secret** for each secret:

   **Secrets for production server:**
   - `SSH_PRIVATE_KEY` - private key for production server
   - `SSH_KNOWN_HOSTS` - production server fingerprint
   - `SSH_USER` - user on production server (e.g., `github-deploy`)
   - `SSH_HOST` - IP or domain of production server
   - `SSH_PORT` - SSH port (usually `22`)

### Step 3: Create Environment Secrets for STAGING

**Path**: `Settings → Environments → staging`

Repeat the process for staging environment with **different values**:

   **Secrets for staging server:**
   - `SSH_PRIVATE_KEY` - private key for staging server (can be the same or different)
   - `SSH_KNOWN_HOSTS` - staging server fingerprint
   - `SSH_USER` - user on staging server
   - `SSH_HOST` - IP or domain of staging server (must be different!)
   - `SSH_PORT` - SSH port

### Step 4: Add Environment Variables

**Production** (`Settings → Environments → production → Variables`):
- Name: `PRODUCTION_URL`
- Value: `https://drevo-info.ru/new/` (or your URL)

**Staging** (`Settings → Environments → staging → Variables`):
- Name: `STAGING_URL`
- Value: `https://staging.drevo-info.ru/` (or your staging URL)

### Step 5: Delete Repository Secrets

**IMPORTANT**: Delete only **after** you've confirmed that Environment secrets are working!

**Path**: `Settings → Secrets and variables → Actions → Secrets`

Delete:
- `SSH_PRIVATE_KEY`
- `SSH_KNOWN_HOSTS`
- `SSH_USER`
- `SSH_HOST`
- `SSH_PORT`

## 🔐 How to Get Secret Values

### 🚀 Quick Method (Recommended)

Use the interactive script to help you get all values:

```bash
./scripts/generate-github-secrets.sh
```

The script will prompt for server details and generate all necessary secret values.

### 📝 Manual Method

If you want to get values manually or need only a specific secret:

### SSH_KNOWN_HOSTS (IMPORTANT!)

**This is the SSH server fingerprint for secure connection.**

#### Method 1: Use the Script

```bash
# For production server
./scripts/get-ssh-known-hosts.sh your-production-server.com

# For staging server  
./scripts/get-ssh-known-hosts.sh your-staging-server.com

# If SSH is on a non-standard port
./scripts/get-ssh-known-hosts.sh your-server.com 2222
```

The script will output a ready-to-copy value for the GitHub Secret.

#### Method 2: Manually via ssh-keyscan

```bash
# For production server
ssh-keyscan -H production-server-ip-or-domain

# For staging server
ssh-keyscan -H staging-server-ip-or-domain

# If SSH is on a non-standard port (e.g., 2222)
ssh-keyscan -p 2222 -H your-server.com
```

**What you will see:**
```
|1|aBcDeFgH1234567890...= ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAAB...
|1|aBcDeFgH1234567890...= ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNo...
|1|aBcDeFgH1234567890...= ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA...
```

**COPY ALL LINES COMPLETELY** (all 3-4 lines) and paste into GitHub Secret `SSH_KNOWN_HOSTS`.

#### What the Output Means:

- First part `|1|aBcDeFgH...=` - hashed hostname (for security)
- Second part `ssh-rsa` / `ecdsa-sha2-nistp256` / `ssh-ed25519` - key type
- Third part `AAAAB3...` - the actual server public key

**The `-H` flag** hashes the hostname so it cannot be read from known_hosts.

#### Connection Check:

After copying SSH_KNOWN_HOSTS, you can verify that the server is accessible:

```bash
# Test connection
ssh -p 22 your-user@your-server.com "echo 'Connection OK'"
```

### SSH_PRIVATE_KEY

```bash
# Create new SSH key for production
ssh-keygen -t ed25519 -C "github-actions-production" -f ~/.ssh/github-deploy-prod

# Create new SSH key for staging
ssh-keygen -t ed25519 -C "github-actions-staging" -f ~/.ssh/github-deploy-staging

# View private key (for GitHub Secret)
cat ~/.ssh/github-deploy-prod
# All output (including -----BEGIN/END-----) should be pasted into SSH_PRIVATE_KEY

# Copy public key to server
ssh-copy-id -i ~/.ssh/github-deploy-prod.pub user@production-server

# Or manually:
cat ~/.ssh/github-deploy-prod.pub | ssh user@production-server 'mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'
```

**Important:** The private key must include the `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----` lines.

### SSH_USER

```bash
# Username on the server
github-deploy
# or another user that will be used for deployment
```

This is simply the Linux username on the server. It's recommended to create a separate user for deployment.

### SSH_HOST

```bash
# Production - IP address
123.45.67.89

# Or domain name
production.drevo-info.ru

# Staging
staging.drevo-info.ru
```

### SSH_PORT

```bash
# Usually the standard SSH port
22

# Or another port if SSH is configured on a non-standard port
2222
```

## ✅ Configuration Verification

After migration, run the verification script:

```bash
chmod +x scripts/check-github-secrets.sh
./scripts/check-github-secrets.sh
```

Or manually check via GitHub CLI:

```bash
# Check production
gh api repos/:owner/:repo/environments/production/secrets --jq '.secrets[].name'
gh api repos/:owner/:repo/environments/production/variables --jq '.variables[] | "\(.name) = \(.value)"'

# Check staging
gh api repos/:owner/:repo/environments/staging/secrets --jq '.secrets[].name'
gh api repos/:owner/:repo/environments/staging/variables --jq '.variables[] | "\(.name) = \(.value)"'
```

## 🧪 Testing

### Staging

1. Make a commit to the `main` branch
2. CI will complete successfully
3. Staging deployment will start automatically
4. Check logs: `Actions → Deploy to Staging`

### Production

1. Create a tag: `git tag v1.0.0 && git push origin v1.0.0`
2. Production deployment will start automatically
3. Check logs: `Actions → Deploy to Production`

## ⚠️ Important Notes

1. **Environment secrets take priority** over Repository secrets
2. If a secret exists in both places - Environment secret is used
3. **Secret values cannot be viewed** after creation (only updated)
4. **Variables can be viewed** - they are not hidden
5. Workflows are **already configured** to use Environment secrets via `environment:` in jobs

## 🎯 Result

After migration:
- ✅ Production deploys to one server
- ✅ Staging deploys to another server
- ✅ Each environment uses its own credentials
- ✅ Security: secrets are separated by environment
- ✅ Flexibility: different access rules can be configured for each environment

## 📚 Additional Information

GitHub allows you to configure for each environment:
- **Protection rules** - require approval before deployment
- **Deployment branches** - restrict which branches can deploy
- **Wait timer** - delay before deployment

It's recommended to enable these protections for production!
