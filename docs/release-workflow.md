# Release workflow

Cutting a release from `main`. Beta deploys happen on every push to `main` and need nothing from this document.

## Primary — GitHub Actions

GitHub Actions → **CD Main Release** → Run workflow → select `main` → choose the bump type (`patch` / `minor` / `major`) → Run.

The workflow computes the next semver from the last tag, checks that `main` is green, creates the tag and deploys to drevo-release (port 4011).

## Backup — a manual tag

```bash
git tag -a X.Y.Z -m "..."
git push origin X.Y.Z
```

The pipeline is the same one the workflow triggers; only the tag creation differs. Use this when the Actions UI is unavailable — the version has to be computed by hand, which is the one thing the primary path does for you.

## Hotfixes on `iframe`

`iframe` is the frozen legacy branch. Its CD runs on `workflow_dispatch` only, and its tags carry the `iframe-` prefix: `iframe-X.Y.Z`.
