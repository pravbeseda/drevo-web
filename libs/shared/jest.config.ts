export default {
    displayName: 'shared',
    preset: '../../jest.preset.js',
    testEnvironment: 'node',
    transform: {
        '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
    },
    moduleFileExtensions: ['ts', 'js', 'html'],
    coverageDirectory: '../../coverage/libs/shared',
    // Threshold keys resolve against process.cwd(), which Nx sets to the workspace root —
    // hence the full paths. The two globs together match every covered file, which keeps
    // `global` an aggregate over all of them.
    coverageThreshold: {
        global: { lines: 83, branches: 80, functions: 84, statements: 83 },
        // Per file, so a new helper with no spec fails on its own.
        './libs/shared/src/lib/!(models)/**/*.ts': { statements: 70 },
        // Declaration-only modules: interfaces and enums with no executable body.
        './libs/shared/src/lib/models/**/*.ts': { statements: 0 },
    },
};
