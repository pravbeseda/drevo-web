import playwright from 'eslint-plugin-playwright';
import baseConfig from '../../eslint.config.mjs';

export default [
    playwright.configs['flat/recommended'],
    ...baseConfig,
    {
        files: ['**/*.ts', '**/*.js'],
        rules: {
            // The shared assertions live in `api-test-helpers.ts`, so a test body that only calls
            // `expectSecurityHeaders(response)` has no literal `expect` for the rule to see. The
            // names are matched exactly — a new helper is reported until it is registered here,
            // which is the point: the list states what counts as an assertion.
            'playwright/expect-expect': [
                'error',
                {
                    assertFunctionNames: ['expectSecurityHeaders'],
                },
            ],
        },
    },
];
