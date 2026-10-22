# Docs — audit 2026-10-22

## DOC-1 · blocking · Two git-hook systems override each other; the README step turns off the commit gates and the secret scan never runs

- **Where:** `README.md:79,134`, `docs/security-scanning.md:12-16,125`, `scripts/setup-git-hooks.sh:18`, `.githooks/pre-commit`, `.husky/pre-commit`, `.husky/commit-msg`, `package.json` (`"prepare": "husky"`)
- **What this is:** Husky points `core.hooksPath` at `.husky/_` on every `pnpm install` (lint-staged, commitlint). The README and `security-scanning.md` also tell the reader to run `./scripts/setup-git-hooks.sh`, which points `core.hooksPath` at `.githooks/` (gitleaks only).
- **Problem:** Whichever ran last wins. Following the README order (`pnpm install`, then the script) turns off ESLint/Prettier/Stylelint on commit and commitlint, which AGENTS.md relies on; the next `pnpm install` switches back and silently drops gitleaks. This checkout is on `.husky/_`, so the "pre-commit hook scans staged files" claim is false today. `security-scanning.md:125` also lists the CI triggers as `main`/`iframe`/`feature/*`; the workflow runs on `'**'`.
- **Fix direction:** Keep one hook system — call `gitleaks protect --staged` from `.husky/pre-commit`, or rely on the CI scan — then delete `.githooks/` and `setup-git-hooks.sh` and fix the README and `security-scanning.md`.
- **If we skip it:** Each new clone loses either the lint and commitlint gates or the secret scan, with no message.
- **Effort:** S · **Touches:** `.husky/pre-commit`, `.githooks/`, `scripts/setup-git-hooks.sh`, `README.md`, `docs/security-scanning.md` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## DOC-2 · blocking · `README-deployment.md` gives rollback commands for a layout that no longer exists

- **Where:** `README-deployment.md:7-36,47-73,300-306,384-385,391-401` (and `drevo-staging` at `:66,74,100,104,196,209,212`); versus `scripts/deploy.sh:76-104,147-148`, `scripts/ecosystem.config.js`, `.github/actions/deploy/action.yml:88`
- **What this is:** A 430-line server runbook for deploy, rollback and troubleshooting. Nothing in the repository links to it.
- **Problem:** `./deploy.sh staging 20240923-0900` passes two arguments; the script accepts four (or five with `--dry-run`) and exits with its usage text. Rollback uses `~/staging-previous` / `~/production-current` and `--only drevo-staging`; `deploy.sh` writes `~/releases/<env>-{current,previous,prev-N}` and no PM2 app is named `drevo-staging` (`drevo-production` is real, but its symlink paths here are wrong). Port 4001, `NODE_ENV=staging`, `cd-staging.yml` and `cd-production.yml` do not exist.
- **Fix direction:** Delete the file and keep one short runbook beside `SCRIPTS-GUIDE.md`, written against the real `~/releases/<env>-*` symlinks and the beta/release apps.
- **If we skip it:** The document an operator opens during an outage gives commands that fail or touch the wrong symlinks.
- **Effort:** M · **Touches:** `README-deployment.md`, `SCRIPTS-GUIDE.md` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## DOC-3 · blocking · The secrets-migration and server-setup guides describe environments the workflows do not use; following them breaks both deploys

- **Where:** `docs/github-secrets-migration.md:47,64,68-79,215-216,242`; `docs/server-github-setup.md:36-69,185-192`; `scripts/generate-github-secrets.sh:37-46`; versus `.github/workflows/cd-main-beta.yml:83,181`, `.github/workflows/cd-main-release.yml:5,194,221-223,264-268`
- **What this is:** A plan to move SSH secrets into `production` and `staging` GitHub environments and then delete the repository secrets, plus a server/GitHub setup guide and its helper script.
- **Problem:** The deploy jobs use the `beta` and `release` environments (there is no `staging`), and they read every `SSH_*`/`SENTRY_*` as a repository secret — `beta` and `release` hold only `BETA_URL`/`RELEASE_URL`. The guide's Step 5, "Delete Repository Secrets", would therefore break both deploys. `scripts/check-github-secrets.sh` does not exist; `git tag v1.0.0` does not match the release trigger `tags: ['[0-9]*']`; `server-github-setup.md` creates `STAGING_URL`/`PRODUCTION_URL` and `~/staging`/`~/production`, which nothing reads any more.
- **Fix direction:** Rewrite the migration guide for `beta`/`release` if environment-scoped secrets are still wanted, or delete it; bring `server-github-setup.md` and the script's prompt in line with beta/release. The repository variables `STAGING_URL`/`PRODUCTION_URL` (GitHub settings) are unread.
- **If we skip it:** A reader who finishes the migration as written takes down the beta and release deploys.
- **Effort:** S · **Touches:** `docs/github-secrets-migration.md`, `docs/server-github-setup.md`, `scripts/generate-github-secrets.sh` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## DOC-4 · blocking · The AGENTS.md component scaffolding command fails on Nx 23

- **Where:** `AGENTS.md:58`
- **What this is:** The canonical command for a new component.
- **Problem:** `nx g @nx/angular:component my-component --project=client --changeDetection=OnPush` fails with `'project' is not found in schema` on @nx/angular 23.2.1 (re-run with `--dry-run`): the schema requires `path` and sets `additionalProperties: false`. The service line at `:59` still runs.
- **Fix direction:** Use the path form, e.g. `nx g @nx/angular:component apps/client/src/app/.../my-component --changeDetection=OnPush`.
- **If we skip it:** Every agent or developer who follows the canon fails on the first try.
- **Effort:** S · **Touches:** `AGENTS.md` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## DOC-5 · blocking · AGENTS.md says the dev proxy forwards `/pictures`; it forwards `/images`

- **Where:** `AGENTS.md:111,151`; versus `apps/client/proxy.conf.json`, `apps/client/src/app/app.routes.ts:41`, `apps/client/src/app/services/pictures/picture.service.ts:163-193`
- **What this is:** The entry-point summary of what the dev server proxies to the PHP backend, and the rule to check that file before writing an API service.
- **Problem:** `proxy.conf.json` proxies `/api` and `/images`; `/pictures` is an Angular route, so a reader who "restores" a `/pictures` proxy shadows that page in dev. Line 151 sends the reader to `proxy.conf.json` to learn whether an endpoint is still PHP, but the file forwards all of `/api` and cannot answer that.
- **Fix direction:** Change `/pictures` to `/images`; point line 151 at `legacy-drevo-yii/protected/controllers/api/`, which `docs/legacy-yii.md` already names.
- **If we skip it:** A wrong fact in the canon, on the topic it tells readers to check first.
- **Effort:** S · **Touches:** `AGENTS.md` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## DOC-6 · blocking · `auth-api.md` names the wrong production frontend origin

- **Where:** `docs/auth-api.md:23,102,265,327,332`; versus `legacy-drevo-yii/protected/config/main.php:43`, `legacy-drevo-yii/protected/components/CorsFilter.php:7`, `apps/client-e2e/src/api/api-cors.spec.ts:10`, `apps/client/project.json:37`, `apps/client/src/app/features/editor/iframe.service.ts:11`
- **What this is:** The API contract doc, listing the CORS allowed origin and the Origin header for login and logout.
- **Problem:** It names `https://new.drevo-info.ru`. The backend, the e2e contract tests, the iframe allowlist and the SSR `allowedHosts` all use `https://app.drevo-info.ru`; `new.` appears nowhere else. A client debugged against this doc gets `ORIGIN_NOT_ALLOWED`, and the SSR server answers 400 for that host.
- **Fix direction:** Replace `new.drevo-info.ru` with `app.drevo-info.ru` throughout (and re-check the SameSite reasoning at `:23`, which no longer holds for the same site).
- **If we skip it:** The security section of the auth contract is wrong about the one origin it allows.
- **Effort:** S · **Touches:** `docs/auth-api.md` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## DOC-7 · blocking · The project `create` skill forbids writing tests first

- **Where:** `.claude/skills/create/SKILL.md:58-73`; versus AGENTS.md Quality rule 3 and the quality-gate list
- **What this is:** A checked-in Claude Code skill that runs plan, then implement, then test.
- **Problem:** It implements first, checks only `pnpm lint` and `pnpm build`, and ends with "Never write tests before user confirms the implementation works". AGENTS.md: "TDD is mandatory — always, no exceptions. Write the test first and watch it fail." An agent running `/create` follows the skill and breaks the canon.
- **Fix direction:** Rewrite Phases 2–3 as red → green → refactor and point at the quality-gate list, or delete the skill.
- **If we skip it:** The repository's own feature workflow tells agents to skip the rule the canon calls mandatory.
- **Effort:** S · **Touches:** `.claude/skills/create/SKILL.md` · **Depends on:** — · **Status:** new (related to #258) · **Verified:** confirmed

## DOC-8 · suggestion · `docs/security-audit-report.md` is a stale snapshot with false claims

- **Where:** `docs/security-audit-report.md:106,150-151,168,170,192-200,291`
- **What this is:** A secrets audit from 2025-10-09, taken on a feature branch, scoring the repository "10/10".
- **Problem:** It cites `nginx/drevo-info.ru.conf` (not in the repository) and a `develop` branch, says the scan "blocks merge" (branch protection requires only `ci`), and describes the `.githooks` setup from DOC-1 as active. Nothing links to it.
- **Fix direction:** Delete it (the repository already deletes finished snapshots, e.g. cd5cf98c).
- **If we skip it:** A false "blocks merge" security claim stays in `docs/`.
- **Effort:** S · **Touches:** `docs/security-audit-report.md` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## DOC-9 · suggestion · The plan `initial-bundle-barrels.md` is fully done

- **Where:** `.github/tasks/initial-bundle-barrels.md`
- **What this is:** The plan for #461: drop the `@drevo-web/ui` root barrel, split off `@drevo-web/shared/diff`, add the `lint:bundle` gate.
- **Problem:** Every item landed: no `libs/ui/src/index.ts`; 34 `@drevo-web/ui/*` paths; `@drevo-web/shared/diff` in `tsconfig.base.json:23` and `knip.json:10`; the gate script and its test; `lint:bundle` in `package.json:24`; `statsJson` in `project.json:42`; the gate in `cd-main-beta.yml:77`; #461 and #205 closed.
- **Fix direction:** Delete the file; git history keeps it.
- **If we skip it:** A finished plan sits where the next reader looks for open work.
- **Effort:** S · **Touches:** `.github/tasks/initial-bundle-barrels.md` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## DOC-10 · suggestion · The plan `forum-reply-drafts.md` is fully done

- **Where:** `.github/tasks/forum-reply-drafts.md`
- **What this is:** The plan for per-topic forum reply drafts.
- **Problem:** Every item landed: `ForumDraftService` with `drafts`/`get`/`edit`/`save`, used by the composer and the topic list; the `xsmall` icon size; the masked badge with `$forum-draft-badge-*` tokens (`_tokens.scss:110-112`); `draft-excerpt.ts` beside `forum-quote.ts`; the Playwright case around `forum-posting.spec.ts:162-164`. Its design item 5 ("the first non-empty line") also contradicts its Decision 3, which the code follows.
- **Fix direction:** Delete the file.
- **If we skip it:** A done plan whose design section contradicts the shipped behaviour.
- **Effort:** S · **Touches:** `.github/tasks/forum-reply-drafts.md` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## DOC-11 · suggestion · `SCRIPTS-GUIDE.md` repeats other files and carries a false base-href line

- **Where:** `SCRIPTS-GUIDE.md:108` and its command and environment sections; `README.md:107`
- **What this is:** A scripts guide linked from the README.
- **Problem:** Its build/serve/start commands repeat the README, and its ports/PM2 table repeats `ecosystem.config.js`. Line 108 says beta and release get `--base-href=/` from CI; no workflow passes a base href.
- **Fix direction:** Fold the `deploy.sh` examples and the runbook from DOC-2 into one place and delete the rest, or at least drop line 108.
- **If we skip it:** Two copies of the same commands drift, and one already carries a false claim.
- **Effort:** S · **Touches:** `SCRIPTS-GUIDE.md`, `README.md` · **Depends on:** DOC-2, LEAN-10 · **Status:** new · **Verified:** confirmed

## DOC-12 · suggestion · The README project tree and tech table repeat AGENTS.md and have drifted

- **Where:** `README.md:9-58`; versus AGENTS.md (tech table and architecture tree)
- **What this is:** A second copy of the repository map.
- **Problem:** It lists six of the nine features (no calendar, forum, picture), calls `apps/client-e2e` "E2E tests (Playwright)" though it holds API contract tests only, omits `testing/playwright/`, and calls the iframe editor "collaborative editing".
- **Fix direction:** Replace both with a one-line pointer to AGENTS.md.
- **If we skip it:** Every structural change is edited in two places, and the README copy is already behind.
- **Effort:** S · **Touches:** `README.md` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## DOC-13 · suggestion · Copilot chat modes carry instructions for a different stack

- **Where:** `.github/chatmodes/Coder.chatmode.md:16,34,40,42`, `.github/chatmodes/Planner.chatmode.md`, `.github/agents/Review-actor.agent.md:5`
- **What this is:** VS Code Copilot agent and chat-mode prompts, last touched in d2f00929 (2026-01-18).
- **Problem:** They mention Ansible `meta/main.yml`, Python environment tools, an Nginx config and `changes`/`create_issue` tools, none of which exist here; Coder's "use test first whenever possible" is weaker than the mandatory-TDD canon. VS Code loads these by directory convention, so only the owner knows whether they are in use.
- **Fix direction:** Delete them if unused, or align them with AGENTS.md (owner's call).
- **If we skip it:** A second set of agent instructions disagrees with the canon.
- **Effort:** S · **Touches:** `.github/chatmodes/`, `.github/agents/` · **Depends on:** — · **Status:** new · **Verified:** confirmed

## DOC-14 · suggestion · The README Node prerequisite is below what `engines` accepts

- **Where:** `README.md:65`; versus `package.json` `engines.node` (`^22.22.3 || ^24.15.0 || >=26.0.0`), `.nvmrc` (`22.23.3`)
- **What this is:** The setup prerequisites.
- **Problem:** "Node.js 22.12+ (or 24+)" admits 22.12–22.22.2 and 24.0–24.14, which `engines` excludes. Nothing hard-fails today (pnpm only warns), but the README restates a fact that has drifted.
- **Fix direction:** Point at `.nvmrc` / `engines` instead of restating a version.
- **If we skip it:** New setups run on versions the project does not support.
- **Effort:** S · **Touches:** `README.md` · **Depends on:** — · **Status:** new · **Verified:** confirmed (downgraded from blocking by the verifier)

## DOC-15 · suggestion · `security-scan.yml` claims to be byte-identical on `main` and `iframe`; it is not

- **Where:** `.github/workflows/security-scan.yml:1-3`; versus `origin/iframe` at 2b8d1a4d
- **What this is:** A comment stating the rule that the gitleaks workflow is mirrored on both branches.
- **Problem:** The copies differ in `actions/checkout` (v7 vs v4), `gitleaks-action` (v3 vs v2) and `upload-sarif` (v4 vs v3); Renovate bumps `main` only, so the claim breaks again with every update. Both branches still scan.
- **Fix direction:** Mirror the file to `iframe` and relax the comment to "same triggers and configuration".
- **If we skip it:** A false comment, and scanners that keep drifting apart.
- **Effort:** S · **Touches:** `.github/workflows/security-scan.yml` (both branches) · **Depends on:** — · **Status:** new · **Verified:** confirmed (downgraded from blocking by the verifier)
