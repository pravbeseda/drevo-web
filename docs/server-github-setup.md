# Server and GitHub Setup for Automated Deployments

## Overview

This guide sets up the server and the GitHub repository so that the deploy workflows can run: `cd-main-beta.yml` and `cd-main-release.yml` on `main`, `cd-iframe-release.yml` on `iframe`. All three deploy to one server, as one user, with one SSH key.

## Prerequisites

- Access to your server (SSH or console)
- Admin rights on your GitHub repository

## Part 1: Server Configuration

### Step 1: Create Dedicated Deployment User

```bash
# Connect to your server as root or sudo user
ssh root@drevo-info.ru

# Create github-deploy user
sudo useradd -m -s /bin/bash github-deploy

# Verify user creation
id github-deploy
# Expected output: uid=1001(github-deploy) gid=1001(github-deploy) groups=1001(github-deploy)
```

### Step 2: Set Up the Directory Structure

```bash
# Create SSH directory for github-deploy user
sudo mkdir -p /home/github-deploy/.ssh
sudo chmod 700 /home/github-deploy/.ssh

# Create the releases directory; deploy.sh creates everything below it, and ~/logs, itself
sudo mkdir -p /home/github-deploy/releases

# Set proper ownership
sudo chown -R github-deploy:github-deploy /home/github-deploy

# nginx reads the static assets: new releases inherit the www-data group through setgid
sudo chgrp www-data /home/github-deploy/releases
sudo chmod g+s /home/github-deploy/releases

# Verify directory structure
sudo ls -la /home/github-deploy/
# Expected output:
# drwx------  2 github-deploy github-deploy 4096 ... .ssh
# drwxr-sr-x  2 github-deploy www-data      4096 ... releases
```

The layout `deploy.sh` builds under `releases/`, and how to roll back, is in the Server Runbook section of [SCRIPTS-GUIDE.md](../SCRIPTS-GUIDE.md).

### Step 3: Install Node.js and PM2

Install Node.js for `github-deploy` (via nvm — `deploy.sh` loads `~/.nvm/nvm.sh` in non-interactive sessions) and PM2, then set up PM2 startup: [pm2-setup.md](pm2-setup.md).

## Part 2: SSH Key Generation and Configuration

### Step 4: Generate SSH Keys for GitHub Actions

```bash
# On your local machine or server, generate SSH key pair
ssh-keygen -t ed25519 -C "github-deploy@drevo-info.ru" -f ~/.ssh/github_deploy_key -N ""

# This creates two files:
# ~/.ssh/github_deploy_key (private key - will go to GitHub Secrets)
# ~/.ssh/github_deploy_key.pub (public key - will go to server)

# Display public key (copy this for server setup)
cat ~/.ssh/github_deploy_key.pub
# Expected output: ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... github-deploy@drevo-info.ru
```

### Step 5: Install Public Key on Server

```bash
# Connect to server
ssh root@drevo-info.ru

# Add public key to github-deploy user
sudo su - github-deploy

# Create authorized_keys file (replace PUBLIC_KEY_CONTENT with actual key)
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... github-deploy@drevo-info.ru" > ~/.ssh/authorized_keys

# Set proper permissions
chmod 600 ~/.ssh/authorized_keys

# Verify file content
cat ~/.ssh/authorized_keys

exit
```

### Step 6: Test SSH Key Authentication

```bash
# From your local machine, test SSH connection
ssh -i ~/.ssh/github_deploy_key github-deploy@drevo-info.ru "echo 'SSH connection successful'"
# Expected: SSH connection successful

# Test file operations
ssh -i ~/.ssh/github_deploy_key github-deploy@drevo-info.ru "touch releases/ssh_test.txt"
ssh -i ~/.ssh/github_deploy_key github-deploy@drevo-info.ru "ls -la releases/"
# Expected: ssh_test.txt should be listed

# Clean up test file
ssh -i ~/.ssh/github_deploy_key github-deploy@drevo-info.ru "rm releases/ssh_test.txt"
```

### Step 7: Get Server Fingerprint

```bash
# Get server fingerprint for GitHub Actions; add -p <port> when SSH is not on 22
ssh-keyscan drevo-info.ru > known_hosts

# Display fingerprint (copy this for GitHub secrets)
cat known_hosts
# Expected: drevo-info.ru ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA...
```

## Part 3: GitHub Repository Configuration

### Step 8: Configure GitHub Secrets

Navigate to: **Settings → Secrets and variables → Actions**

Click **"New repository secret"** and add the following secrets. They are repository secrets, not environment secrets: every deploy job reads them, whatever its environment.

#### Required Secrets:

1. **SSH_PRIVATE_KEY**
   ```
   # Copy content of ~/.ssh/github_deploy_key (private key file)
   -----BEGIN OPENSSH PRIVATE KEY-----
   b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAlwAAAAdzc2gtcn...
   -----END OPENSSH PRIVATE KEY-----
   ```

2. **SSH_KNOWN_HOSTS**
   ```
   # Copy content from known_hosts file
   drevo-info.ru ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...
   ```

3. **SSH_USER**
   ```
   github-deploy
   ```

4. **SSH_HOST**
   ```
   drevo-info.ru
   ```

5. **SSH_PORT** (optional, defaults to 22)
   ```
   2222
   ```

#### Optional Secrets (Sentry):

- **SENTRY_DSN** — written into the production build; without it Sentry is disabled
- **SENTRY_AUTH_TOKEN**, **SENTRY_ORG**, **SENTRY_PROJECT** — source-map upload; skipped when any is unset

### Step 9: Set Up GitHub Environments

Navigate to: **Settings → Environments**

| Environment | Used by | Variable |
|-------------|---------|----------|
| `beta` | `deploy` job, `cd-main-beta.yml` | `BETA_URL` = `https://beta.drevo-info.ru` |
| `release` | `release` job, `cd-main-release.yml` | `RELEASE_URL` = `https://app.drevo-info.ru` |
| `production` | `deploy` job, `cd-iframe-release.yml` on `iframe` | — |

Each environment holds only its URL variable, which goes into the run summary or the GitHub Release body. None has protection rules. If you add deployment branch rules, `release` must allow both the `main` branch (the `workflow_dispatch` run) and tags matching `[0-9]*` (a pushed tag), and `production` must allow the `iframe` branch — GitHub refuses a job whose ref the rules leave out.

## Part 4: Verification Tests

### Step 10: Test Complete Setup

```bash
# Test 1: SSH connection from GitHub Actions perspective
ssh -i ~/.ssh/github_deploy_key -o StrictHostKeyChecking=no github-deploy@drevo-info.ru "echo 'GitHub Actions SSH test successful'"

# Test 2: File deployment simulation
echo "<h1>Test Deployment</h1>" | ssh -i ~/.ssh/github_deploy_key github-deploy@drevo-info.ru "cat > releases/test-deploy.html"

# Test 3: Test rsync (similar to what GitHub Actions will use)
echo "<h1>Rsync Test</h1>" > local-test.html
rsync -avz --delete -e "ssh -i ~/.ssh/github_deploy_key" local-test.html github-deploy@drevo-info.ru:releases/
rm local-test.html

# Test 4: Verify rsync worked
ssh -i ~/.ssh/github_deploy_key github-deploy@drevo-info.ru "cat releases/local-test.html"
# Expected: <h1>Rsync Test</h1>

# Clean up test files
ssh -i ~/.ssh/github_deploy_key github-deploy@drevo-info.ru "rm releases/test-deploy.html releases/local-test.html"
```

### Step 11: Final Security Check

```bash
# Verify github-deploy user has limited access
ssh -i ~/.ssh/github_deploy_key github-deploy@drevo-info.ru "whoami"
# Expected: github-deploy

# Verify user cannot access other directories
ssh -i ~/.ssh/github_deploy_key github-deploy@drevo-info.ru "ls /root" 2>&1
# Expected: Permission denied

# Verify user cannot use sudo
ssh -i ~/.ssh/github_deploy_key github-deploy@drevo-info.ru "sudo ls" 2>&1
# Expected: github-deploy is not in the sudoers file

# Verify user can only write to designated directories
ssh -i ~/.ssh/github_deploy_key github-deploy@drevo-info.ru "touch /tmp/test" 2>&1
# Expected: Permission denied (or success - both are fine)
```

## Troubleshooting

### Common Issues:

1. **Permission denied (publickey)**
   - Check SSH key permissions: `chmod 600 ~/.ssh/github_deploy_key`
   - Verify public key is correctly added to server
   - Check SSH agent: `ssh-add ~/.ssh/github_deploy_key`

2. **Web server shows 403 Forbidden**
   - This is not related to CI/CD setup - configure your web server separately

3. **SSH connection works but file operations fail**
   - Check directory ownership: `chown -R github-deploy /home/github-deploy` — owner only, so `releases/` keeps its `www-data` group
   - Verify user is in correct group: `groups github-deploy`

4. **Domain not accessible**
   - This is not related to CI/CD setup - configure DNS and web server separately

## Security Notes

- ✅ **github-deploy user has no sudo access**
- ✅ **SSH key authentication only (no password)**
- ✅ **Limited to specific directories only**
- ✅ **Separate user from main server administration**
- ✅ **Repository-specific SSH key access**
- ✅ **Private key stored securely in GitHub Secrets**

## Next Steps

After completing this setup successfully:

1. ✅ **All tests in Step 10 pass**
2. ✅ **GitHub secrets and environments configured**
3. ✅ **SSH key authentication works**

The next push to `main` deploys beta. Cutting a release: [release-workflow.md](release-workflow.md). Operating the server afterwards: the Server Runbook section of [SCRIPTS-GUIDE.md](../SCRIPTS-GUIDE.md).
