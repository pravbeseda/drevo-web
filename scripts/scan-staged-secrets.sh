#!/bin/sh
# Scans staged changes for secrets; run by .husky/pre-commit.
# Without gitleaks it only warns: security-scan.yml still scans every push.

if ! command -v gitleaks >/dev/null 2>&1; then
    echo "⚠️  gitleaks is not installed: staged files were NOT scanned for secrets." >&2
    echo "   Install it to scan before commit: https://github.com/gitleaks/gitleaks#installing" >&2
    exit 0
fi

exec gitleaks git --staged --redact --verbose --no-banner
