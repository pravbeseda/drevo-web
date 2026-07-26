export default {
    displayName: 'shared',
    preset: '../../jest.preset.js',
    testEnvironment: 'node',
    transform: {
        '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
    },
    moduleFileExtensions: ['ts', 'js', 'html'],
    coverageDirectory: '../../coverage/libs/shared',
    coverageThreshold: {
        global: { lines: 64, branches: 62, functions: 58, statements: 63 },
    },
};
