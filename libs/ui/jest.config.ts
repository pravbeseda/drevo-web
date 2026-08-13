export default {
    displayName: 'ui',
    preset: '../../jest.preset.js',
    setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
    coverageDirectory: '../../coverage/libs/ui',
    // Aggregate only. The per-file floor is `yarn lint:coverage`, not a glob key here: a
    // glob group takes its files out of `global`, and Jest then skips the global check
    // rather than failing it, so the two cannot both live in this object.
    // Raised from 90/86/71/90 by the `provideSvgIcons` spec this change adds, keeping the
    // >= 3 points of drift headroom `jest.preset.js` asks for (measured 95.61/89.7/76.28/95.11).
    coverageThreshold: {
        global: { lines: 92, branches: 86, functions: 73, statements: 92 },
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
