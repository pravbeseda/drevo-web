# Security Scanning

This project uses [Gitleaks](https://github.com/gitleaks/gitleaks) to prevent secrets from being committed to the repository.

## Setup

`pnpm install` installs the git hooks (Husky, through the `prepare` script). `.husky/pre-commit` runs `scripts/scan-staged-secrets.sh` first and lint-staged after it; `.husky/commit-msg` runs commitlint.

The scan needs the gitleaks binary, version 8.19 or newer (the first with the `gitleaks git` command):

- **macOS** — `brew install gitleaks`
- **Linux and Windows** — a binary from the [releases page](https://github.com/gitleaks/gitleaks/releases)

## How It Works

### 1. Pre-commit Hook (Local)
Before each commit, gitleaks scans staged files for secrets:
- **Blocks commit** if secrets are detected
- **Provides details** about what was found
- **Warns and skips the scan** when gitleaks is not installed — the CI scan below still runs on push
- **Can be bypassed** with `--no-verify` (not recommended)

### 2. GitHub Actions (CI/CD)
On every push and pull request, gitleaks scans:
- **All commits** in the push/PR
- **Uploads results** to GitHub Security tab
- **Fails the workflow** if secrets are detected

### 3. Configuration
The `.gitleaks.toml` file configures:
- **Allowlisted patterns** (e.g., `${{ secrets.* }}` in GitHub Actions)
- **Ignored files** (e.g., test files, lock files)
- **Custom rules** specific to this project

## Testing the Setup

Test that the hook works:

```bash
# Prints .husky/_ — the hooks pnpm install set up
git config core.hooksPath

# Stages a generated token in a throwaway repository and expects the scan to reject it
node --test scripts/scan-staged-secrets.test.js
```

## Manual Scan

Scan the entire repository:

```bash
# Scan the whole git history
gitleaks git --verbose

# Scan only uncommitted changes
gitleaks git --pre-commit --verbose

# Scan staged files — what the pre-commit hook runs
gitleaks git --staged --verbose
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

It skips lint-staged and commitlint as well.

**Never bypass the check for:**
- Real passwords
- API keys or tokens
- Private keys
- Database credentials
- Any actual secrets

## Continuous Monitoring

The GitHub Action runs automatically on:
- Every push to any branch
- Every pull request to `main` or `iframe`

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
