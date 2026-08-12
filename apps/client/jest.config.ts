export default {
    displayName: 'client',
    preset: '../../jest.preset.js',
    setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
    coverageDirectory: '../../coverage/apps/client',
    // Threshold keys resolve against process.cwd(), which Nx sets to the workspace root —
    // hence the full paths. The three globs together match every covered file, which keeps
    // `global` an aggregate over all of them.
    coverageThreshold: {
        global: { lines: 90, branches: 82, functions: 80, statements: 88 },
        // Per file, so a new component, service or resolver with no spec fails on its own
        // rather than being absorbed by the aggregate above.
        './apps/client/src/**/!(*.routes|*.routes.server|app.config|app.config.browser|app.config.server|forum-history.component|news-history.component|diff-title.resolver).ts':
            { statements: 70 },
        // Declaration-only modules: route tables and the DI configuration. They are exercised
        // by the Playwright suite through real navigation, not by a unit test.
        './apps/client/src/**/{*.routes.ts,*.routes.server.ts,app.config.ts,app.config.browser.ts,app.config.server.ts}':
            { statements: 0 },
        // Genuine gaps, not a category: these three have no spec at all. Tracked in #267.
        './apps/client/src/app/features/history/**/{forum-history.component.ts,news-history.component.ts,diff-title.resolver.ts}':
            { statements: 0 },
    },
    transform: {
        '^.+\\.(ts|mjs|js|html)$': [
            'jest-preset-angular',
            {
                tsconfig: '<rootDir>/tsconfig.spec.json',
                stringifyContentPathRegex: '\\.(html|svg)$',
            },
        ],
    },
    transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
    snapshotSerializers: [
        'jest-preset-angular/build/serializers/no-ng-attributes',
        'jest-preset-angular/build/serializers/ng-snapshot',
        'jest-preset-angular/build/serializers/html-comment',
    ],
};
