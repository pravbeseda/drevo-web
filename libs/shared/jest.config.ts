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
    // Raised from 64/62/58/63 by the three specs this change adds, keeping the >= 3 points of
    // drift headroom `jest.preset.js` asks for (measured 89.65/80.48/96.15/90.21).
    coverageThreshold: {
        global: { lines: 86, branches: 77, functions: 93, statements: 87 },
    },
};
