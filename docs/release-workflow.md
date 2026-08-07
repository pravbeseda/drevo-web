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

Use this when the Actions UI is unavailable. It reaches the same `release` job and deploys the same way — but it is not the same pipeline, and the difference is worth knowing before you type it.

**The guards do not run on this path.** Both of them live in the `compute-version` job, which is `if: github.event_name == 'workflow_dispatch'`. A pushed tag skips that job, and `release` accepts a skipped dependency, so nothing checks that the commit is on `main` and nothing checks that its CI is green. Whatever the tag points at gets deployed.

So the two things the primary path does for you both become yours: compute the next version by hand, and confirm the commit you are tagging is on `main` with a green `ci` check-run. Issue #248 tracks moving the guards where both paths hit them.

## Hotfixes on `iframe`

`iframe` is the frozen legacy branch. Its CD runs on `workflow_dispatch` only, and its tags carry the `iframe-` prefix: `iframe-X.Y.Z`.
