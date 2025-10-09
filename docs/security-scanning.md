# Security Scanning

This project uses [Gitleaks](https://github.com/gitleaks/gitleaks) to prevent secrets from being committed to the repository.

## Setup

### First Time Setup

Run the setup script to configure git hooks:

```bash
./scripts/setup-git-hooks.sh
```

This will:
- Configure git to use custom hooks from `.githooks/`
- Install gitleaks (on macOS with Homebrew)
- Enable pre-commit scanning

### Manual Installation (if needed)

#### macOS
```bash
brew install gitleaks
```

#### Linux
```bash
wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.0/gitleaks_8.18.0_linux_x64.tar.gz
tar -xzf gitleaks_8.18.0_linux_x64.tar.gz
sudo mv gitleaks /usr/local/bin/
```

#### Windows
Download from [releases page](https://github.com/gitleaks/gitleaks/releases)

## How It Works

### 1. Pre-commit Hook (Local)
Before each commit, gitleaks scans staged files for secrets:
- **Blocks commit** if secrets are detected
- **Provides details** about what was found
- **Can be bypassed** with `--no-verify` (not recommended)

### 2. GitHub Actions (CI/CD)
On every push and pull request, gitleaks scans:
- **All commits** in the push/PR
- **Uploads results** to GitHub Security tab
- **Fails the workflow** if secrets are detected

### 3. Configuration
The `.gitleaks.toml` file configures:
- **Allowlisted patterns** (e.g., `${{ secrets.* }}` in GitHub Actions)
- **Ignored files** (e.g., test files, yarn releases)
- **Custom rules** specific to this project

## Testing the Setup

Test that the hook works:

```bash
# This should pass (empty commit, no secrets)
git commit --allow-empty -m "test: verify gitleaks hook"

# Create a test file with a fake secret (DO NOT COMMIT REAL SECRETS!)
echo "password=test123" > test-secret.txt
git add test-secret.txt
git commit -m "test: should be blocked"
# This should be BLOCKED by gitleaks
```

## Manual Scan

Scan the entire repository:

```bash
# Scan all files
gitleaks detect --verbose

# Scan only uncommitted changes
gitleaks protect --verbose

# Scan staged files
gitleaks protect --staged --verbose
```

## Handling False Positives

If gitleaks detects a false positive:

1. **Review the detection** - make sure it's actually a false positive
2. **Update `.gitleaks.toml`** to allowlist the specific pattern:

```toml
[allowlist]
paths = [
    '''path/to/file\.ext$''',
]

regexes = [
    '''specific-pattern-to-ignore''',
]
```

3. **Document why** it's safe in a comment

## Emergency Bypass

⚠️ **Use only in emergencies and with extreme caution:**

```bash
git commit --no-verify -m "your message"
```

**Never bypass the check for:**
- Real passwords
- API keys or tokens
- Private keys
- Database credentials
- Any actual secrets

## Continuous Monitoring

The GitHub Action runs automatically on:
- Every push to `main`, `develop`, or `feature/*` branches
- Every pull request to `main` or `develop`

Check results in:
- **Actions tab**: See workflow runs
- **Security tab** → **Code scanning alerts**: See detailed findings

## Support

If you encounter issues:
1. Check the [Gitleaks documentation](https://github.com/gitleaks/gitleaks)
2. Review `.gitleaks.toml` configuration
3. Contact the team lead

## What Gets Scanned

Gitleaks detects various types of secrets:
- AWS keys
- Azure keys
- Google Cloud keys
- GitHub tokens
- Private SSH keys
- Database passwords
- API keys
- Generic passwords
- And many more...

See the [default rules](https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml) for full list.
