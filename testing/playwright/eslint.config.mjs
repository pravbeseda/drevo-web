import playwright from 'eslint-plugin-playwright';
import baseConfig from '../../eslint.config.mjs';

// The integration suite belongs to no Nx project, so `nx affected -t lint` never reaches it.
// `yarn lint:playwright` runs ESLint here directly; the pre-commit hook and CI both call it.
//
// The playwright preset's remaining findings stay warnings, capped by `--max-warnings` in that
// script so new ones fail the build: no-useless-not (36) rewrites assertions and needs a green
// suite run to verify, expect-expect (11) needs `assertFunctionNames` configured for the Page
// Objects, no-conditional-in-test (4) and no-force-option (1) each need a look. Triage is
// issue #242. The pre-commit hook runs ESLint with --fix, so no-useless-not clears itself in
// whatever specs a commit touches — lower the cap when it does.
export default [
    ...baseConfig,
    {
        ...playwright.configs['flat/recommended'],
        files: ['**/*.ts'],
    },
    {
        files: ['**/*.ts'],
        rules: {
            // `test.skip(isMobile, 'reason')` is runtime capability gating, not a disabled test:
            // the suite runs across 5 browser projects and skips the cases a device cannot do.
            // Both rules target `it.skip` / `describe.skip` and cannot tell the two apart.
            'sonarjs/no-skipped-tests': 'off',
            'playwright/no-skipped-test': 'off',
            // A forgotten `await` on a click or an assertion produces a flaky test rather than a
            // failing one, which is exactly what this rule is for. No violations here, so error
            // costs nothing — same reasoning as the apps/client-e2e block in the root config.
            '@typescript-eslint/no-floating-promises': 'error',
        },
    },
    {
        // Mocks and fixtures reproduce the backend wire format, where the DTO types spell
        // absence as `null` (`PicturePendingDto.pp_title: string | null`) and the API envelope
        // carries `data: null`. `undefined` would not typecheck against those contracts.
        files: ['mocks/**/*.ts', 'fixtures/**/*.ts'],
        rules: {
            'no-null/no-null': 'off',
        },
    },
];
