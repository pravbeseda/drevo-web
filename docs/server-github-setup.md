# Server and GitHub Setup for Automated Deployments

## Overview

This guide walks you through setting up your server and GitHub account to enable automated CI/CD deployments. Complete this setup **before** implementing the CI/CD migration plan.

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

### Step 2: Set Up SSH Directory Structure

```bash
# Create SSH directory for github-deploy user
sudo mkdir -p /home/github-deploy/.ssh
sudo chmod 700 /home/github-deploy/.ssh

# Create deployment directories
sudo mkdir -p /home/github-deploy/staging
sudo mkdir -p /home/github-deploy/production

# Set proper ownership
sudo chown -R github-deploy:github-deploy /home/github-deploy

# Set directory permissions
sudo chmod 755 /home/github-deploy/staging
sudo chmod 755 /home/github-deploy/production

# Verify directory structure
sudo ls -la /home/github-deploy/
# Expected output:
# drwx------ 2 github-deploy github-deploy 4096 ... .ssh
# drwxr-xr-x 2 github-deploy github-deploy 4096 ... staging
# drwxr-xr-x 2 github-deploy github-deploy 4096 ... production
```

### Step 3: Test Deployment Directories

```bash
# Switch to github-deploy user
sudo su - github-deploy

# Test write permissions
echo "test staging" > staging/test.txt
echo "test production" > production/test.txt

# Verify files were created
ls -la staging/ production/
# Expected: test.txt files in both directories

# Clean up test files
rm staging/test.txt production/test.txt

# Exit back to your admin user
exit
```

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
ssh -i ~/.ssh/github_deploy_key github-deploy@drevo-info.ru "touch staging/ssh_test.txt"
ssh -i ~/.ssh/github_deploy_key github-deploy@drevo-info.ru "ls -la staging/"
# Expected: ssh_test.txt should be listed

# Clean up test file
ssh -i ~/.ssh/github_deploy_key github-deploy@drevo-info.ru "rm staging/ssh_test.txt"
```

### Step 6: Get Server Fingerprint

```bash
# Get server fingerprint for GitHub Actions
ssh-keyscan drevo-info.ru > known_hosts

# Display fingerprint (copy this for GitHub secrets)
cat known_hosts
# Expected: drevo-info.ru ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA...
```

## Part 3: GitHub Repository Configuration

### Step 7: Configure GitHub Secrets

Navigate to: **Settings → Secrets and variables → Actions**

Click **"New repository secret"** and add the following secrets:

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
   
   **Note**: If you use a non-standard SSH port, include it in the host: `drevo-info.ru:2222`

### Step 8: Configure GitHub Variables

Navigate to: **Settings → Secrets and variables → Actions → Variables tab**

Click **"New repository variable"** and add:

1. **STAGING_URL**
   ```
   https://beta.drevo-info.ru
   ```

2. **PRODUCTION_URL**
   ```
   https://drevo-info.ru
   ```

### Step 9: Set Up GitHub Environments

Navigate to: **Settings → Environments**

#### Create Staging Environment:
1. Click **"New environment"**
2. Name: `staging`
3. **Protection rules**: None (leave empty)
4. Click **"Configure environment"**
5. No additional configuration needed

#### Create Production Environment:
1. Click **"New environment"**
2. Name: `production`
3. **Protection rules**:
   - ✅ **Required reviewers**: Add yourself
   - ✅ **Deployment branches**: Selected branches and tags
     - Add rule: `main`
     - Add rule: `v*`
4. Click **"Save protection rules"**

## Part 4: Verification Tests

### Step 10: Test Complete Setup

```bash
# Test 1: SSH connection from GitHub Actions perspective
ssh -i ~/.ssh/github_deploy_key -o StrictHostKeyChecking=no github-deploy@drevo-info.ru "echo 'GitHub Actions SSH test successful'"

# Test 2: File deployment simulation
echo "<h1>Test Deployment</h1>" | ssh -i ~/.ssh/github_deploy_key github-deploy@drevo-info.ru "cat > staging/test-deploy.html"

# Test 3: Test rsync (similar to what GitHub Actions will use)
echo "<h1>Rsync Test</h1>" > local-test.html
rsync -avz --delete -e "ssh -i ~/.ssh/github_deploy_key" local-test.html github-deploy@drevo-info.ru:staging/
rm local-test.html

# Test 4: Verify rsync worked  
ssh -i ~/.ssh/github_deploy_key github-deploy@drevo-info.ru "cat staging/local-test.html"
# Expected: <h1>Rsync Test</h1>

# Clean up test files
ssh -i ~/.ssh/github_deploy_key github-deploy@drevo-info.ru "rm staging/test-deploy.html staging/local-test.html"
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
   - Check directory ownership: `chown -R github-deploy:github-deploy /home/github-deploy`
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
2. ✅ **GitHub secrets and variables configured**
3. ✅ **GitHub environments created**
4. ✅ **SSH key authentication works**

**You are now ready to implement the CI/CD Migration Plan!**

Proceed with the main CI/CD migration document to create the actual workflow files.