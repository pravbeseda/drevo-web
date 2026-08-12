export default {
    displayName: 'editor',
    preset: '../../jest.preset.js',
    setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
    coverageDirectory: '../../coverage/libs/editor',
    // The glob key resolves against process.cwd(), which Nx sets to the workspace root.
    // It matches every covered file here, so `global` stays an aggregate over all of them.
    coverageThreshold: {
        global: { lines: 69, branches: 55, functions: 55, statements: 69 },
        // Per file, so a new helper or service with no spec fails on its own rather than
        // being absorbed by the aggregate above. No declaration-only module in this library.
        './libs/editor/src/**/*.ts': { statements: 55 },
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
