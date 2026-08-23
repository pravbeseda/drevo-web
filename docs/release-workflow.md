# Release workflow

Cutting a release from `main`. Beta deploys happen on every push to `main` and need nothing from this document.

## Primary — GitHub Actions

GitHub Actions → **CD Main Release** → Run workflow → select `main` → choose the bump type (`patch` / `minor` / `major`) → Run.

The workflow computes the next semver from the last tag, checks that `main` is green, creates the tag and deploys to drevo-release (port 4011).

## The guards

Both release paths pass through the `guards` job first, and `release` requires it to have succeeded — `needs.guards.result == 'success'`, not `!failure()`, which would also accept a job that never ran:

- the commit being released is on `main` — the `workflow_dispatch` run has to be started from `main`, a pushed tag has to point at a commit reachable from `origin/main`;
- the latest `ci` check-run on that commit concluded `success` — missing, red or still running all refuse.

## Backup — a manual tag

```bash
git tag -a X.Y.Z -m "..."
git push origin X.Y.Z
```

Use this when the Actions UI is unavailable. It reaches the same `release` job and runs under the same guards — a tag on a commit that is off `main` or whose CI is not green is refused before anything deploys.

The one thing the primary path does that this one does not is compute the next version, so that part is yours: read the last tag and pick `X.Y.Z` by hand.

## Hotfixes on `iframe`

`iframe` is the frozen legacy branch. Its CD runs on `workflow_dispatch` only, and its tags carry the `iframe-` prefix: `iframe-X.Y.Z`.
