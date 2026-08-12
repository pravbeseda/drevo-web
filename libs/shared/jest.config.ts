export default {
    displayName: 'shared',
    preset: '../../jest.preset.js',
    testEnvironment: 'node',
    transform: {
        '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
    },
    moduleFileExtensions: ['ts', 'js', 'html'],
    coverageDirectory: '../../coverage/libs/shared',
    // Aggregate only — the per-file floor is `yarn lint:coverage`. See libs/ui/jest.config.ts.
    // These four are raised from 64/62/58/63 by the three specs this change adds.
    coverageThreshold: {
        global: { lines: 89, branches: 80, functions: 95, statements: 89 },
    },
};
