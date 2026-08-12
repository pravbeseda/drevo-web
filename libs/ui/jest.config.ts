export default {
    displayName: 'ui',
    preset: '../../jest.preset.js',
    setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
    coverageDirectory: '../../coverage/libs/ui',
    // The globs are keyed from the workspace root, not from this file: Jest resolves a
    // threshold key against process.cwd(), and Nx runs it from there. Between them the two
    // globs match every covered file, which is what keeps `global` an aggregate over all of
    // them — a file left unmatched would become the whole of the global group instead.
    coverageThreshold: {
        global: { lines: 90, branches: 86, functions: 71, statements: 90 },
        // Per file, so a new component with no spec fails on its own rather than being
        // absorbed by the aggregate above.
        './libs/ui/src/lib/!(constants|providers)/**/*.ts': { statements: 70 },
        // Declaration-only modules: a breakpoint table and an icon registration list. They
        // hold no branch to exercise, and a test would assert the literal back to itself.
        './libs/ui/src/lib/{constants,providers}/**/*.ts': { statements: 0 },
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
