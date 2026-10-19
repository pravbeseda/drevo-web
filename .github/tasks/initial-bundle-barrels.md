# Keep lazy-only library code out of the initial bundle

Issue #461, part of #205.

## Problem

The initial bundle is 1.41 MB raw, above the raised 1.4 MB warning budget. About 260 kB of it is code that only lazy routes use: `@drevo-web/ui` components the layout never renders, their Material/CDK modules, and `diff`/`diff-match-patch` from `@drevo-web/shared`.

esbuild assigns a file to chunks by file-level reachability from each entry point, following every `export … from` in a barrel. Eager code imports the `@drevo-web/ui` and `@drevo-web/shared` barrels, so every module those barrels re-export counts as reachable from `main`. If a lazy route uses one of them, it lands in a chunk that `main` imports statically. `"sideEffects": false` does not change this. An experiment that rewrote every barrel import to a direct path brought the initial bundle down to 1.15 MB raw.

## Design

1. **`@drevo-web/ui` loses its root barrel.** Each folder becomes its own entry point with a small `index.ts`: `components/<name>`, `pipes/<name>`, `modal`, `confirmation`, `constants`, `providers`. That is about 34 entry points, e.g. `@drevo-web/ui/button`, `@drevo-web/ui/format-date`, `@drevo-web/ui/modal`. `libs/ui/src/index.ts` is deleted.
2. **`@drevo-web/shared/diff`** becomes a secondary entry point for `lib/helpers/diff`, and the `@drevo-web/shared` barrel stops re-exporting it. The rest of `@drevo-web/shared` and all of `@drevo-web/core` stay as they are: their content is eager or light.
3. **Path mapping.** Add one explicit `tsconfig.base.json` path per entry point. Fallback arrays could make a single wildcard cover `components/*`, `pipes/*` and the top-level folders, but explicit paths need no resolver support in Jest and esbuild, and they list the public API.
4. **Migration.** A codemod resolves each imported symbol to its declaring file through the TypeScript checker and rewrites `@drevo-web/ui` and `@drevo-web/shared` diff imports in all code: app, libs, specs and testing helpers. After it, run `pnpm format:fix` and `pnpm nx affected -t lint` for `import/order`. The codemod is a one-off and is not committed.
5. **Config and docs.**
   - `knip.json`: list the new entry points.
   - `AGENTS.md` (import aliases, "Library boundaries carry the only barrels") and `docs/architecture.md`: libraries expose one entry point per folder, and why.
   - The new gate goes into the quality-gate list and into `docs/quality-gates.md`.

## Tests

- **Gate, written first (red on `main`):** `scripts/check-initial-bundle.js` with a `node:test` spec, next to `check-file-coverage.js`.
  - It walks the static imports from `main-*.js` in `dist/apps/client/browser-stats.json`.
  - It fails when the initial bundle holds a lazy-only module: `@angular/material/tabs`, `checkbox`, `slide-toggle`, `button-toggle`, `input`, `diff`, `diff-match-patch`. `@angular/cdk/scrolling` is not on the list: `@angular/cdk/overlay`, which the header uses, depends on it.
  - It runs as `pnpm lint:bundle` after `pnpm build`.
  - `statsJson: true` is set in the production build configuration. The file sits next to `browser/`, so it is not served; it travels in the deploy archive unused.
  - CI runs the gate in `cd-main-beta.yml` after `Build verification`.
- **Type coverage:** without the `@drevo-web/ui` barrel, the `libs/editor` program no longer pulls in all of `libs/ui`. The denominator shrinks (8038 → 5420 expressions) while the 8 untyped expressions stay, and the rate drops below the threshold. Fix the editor's own implicit `any`s (`list-commands.ts`, `wiki-highlighter.service.ts`); the threshold does not move.
- **Unit and Playwright:** behaviour does not change, so there are no new tests. The existing suites must stay green after the import rewrite. No Playwright test is added because nothing user-visible changes.

## Done when

- `pnpm lint:bundle` is green, and the initial bundle is 1.15 MB raw in the Angular build report (1.06 MB by the metafile); it was 1.41 MB.
- All quality gates from `AGENTS.md` are green, including `pnpm build` and `pnpm lint:ssr-hosts`.
