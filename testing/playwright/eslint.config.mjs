import playwright from 'eslint-plugin-playwright';
import baseConfig from '../../eslint.config.mjs';

// The integration suite belongs to no Nx project, so `nx affected -t lint` never reaches it.
// `yarn lint:playwright` runs ESLint here directly; the pre-commit hook and CI both call it.
// The run is clean and `--max-warnings=0` in that script keeps it that way.
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
            // Assertions live in the Page Objects (POM convention), so a test body that only
            // calls `layout.expectDarkTheme()` has no literal `expect` for the rule to see.
            // The names are matched exactly — a new PO assertion method is reported until it is
            // registered here, which is the point: the list states what counts as an assertion.
            'playwright/expect-expect': [
                'warn',
                {
                    assertFunctionNames: [
                        'expectDarkTheme',
                        'expectLightTheme',
                        'expectSidebarCollapsed',
                        'expectSidebarExpanded',
                    ],
                },
            ],
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
