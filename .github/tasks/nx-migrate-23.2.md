# Nx 23.1.1 → 23.2.1 via `nx migrate`

## Why

`dependabot.yml` ignores minor and major updates of `nx`, `@nx/*` and `@angular/*`
on purpose: those releases ship schematics that rewrite source, and only
`nx migrate` runs them. Nothing has run it, so the workspace sits on nx 23.1.1
while 23.2.1 is out, and dependabot can only ever offer the 23.1.x patch line.

The patch PRs it did open made the gap visible. The `development-dependencies`
group raised `@nx/*` to 23.1.2 while `nx` itself stayed 23.1.1 in its own group
PR, and the mismatch broke plugin loading:

```
Failed to load 2 Nx plugin(s):
  - @nx/playwright/plugin: The "path" argument must be of type string. Received undefined
  - @nx/eslint/plugin: The "path" argument must be of type string. Received undefined
```

`nx migrate` moves `nx` and every `@nx/*` package as one set, so that split
cannot happen.

## Scope

| Package set | From | To |
|---|---|---|
| `nx`, `@nx/*` | 23.1.1 | 23.2.1 |
| `angular-eslint` | 22.1.0 | 22.5.0 |

`nx migrate` moves only what its own migrations declare, and Angular 22.1.2 →
22.1.6 is a patch line it leaves alone. The Angular packages are therefore
untouched here and stay dependabot's job (#337, #339, #359).

Out of scope, handled separately:

- `@angular/*`, `@angular-devkit/*`, `@angular/cli`, `@schematics/angular` —
  patch bumps dependabot already proposes
- `@types/node` (dependabot #341 proposes 26.4.0; the workspace runs Node 22, so
  the correct target is `^22` — its own task)
- lock-only patch PRs #344, #345, #355, #356, #357
- #358 (`hono`) — a flaky Playwright test, needs a re-run, not a change here

## Steps

1. `nx migrate latest` → writes `package.json` and `migrations.json`
2. `yarn install`
3. `nx migrate --run-migrations` → applies the schematics
4. `yarn lint`, `yarn test`, `yarn build` → all green
5. Playwright integration suite green
6. Review the diff the schematics produced; nothing unrelated to the upgrade
7. Delete `migrations.json`, commit, open the PR

## Supersedes

Merging this closes #338 outright and removes the `@nx/*` half of #340 — the
half that made it red. What is left of #340 after a rebase is the Angular
toolchain and `@swc/core`, which it can carry on its own.
