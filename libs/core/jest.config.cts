module.exports = {
    displayName: 'core',
    preset: '../../jest.preset.js',
    setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
    coverageDirectory: '../../coverage/libs/core',
    // Threshold keys resolve against process.cwd(), which Nx sets to the workspace root —
    // hence the full paths. The two globs together match every covered file, which keeps
    // `global` an aggregate over all of them.
    coverageThreshold: {
        global: { lines: 80, branches: 73, functions: 73, statements: 80 },
        // Per file, so a new service with no spec fails on its own.
        './libs/core/src/lib/**/!(log-database|draft-database|indexed-db-log.provider|log-provider.interface).ts': {
            statements: 85,
        },
        // The IndexedDB layer: jsdom has no implementation, so what a unit test can reach
        // here is the wrapper around the calls, not the calls. Tracked in #267.
        './libs/core/src/lib/**/{log-database.ts,draft-database.ts,indexed-db-log.provider.ts,log-provider.interface.ts}':
            { statements: 4 },
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
