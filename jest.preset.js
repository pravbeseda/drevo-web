const nxPreset = require('@nx/jest/preset').default;
const path = require('path');

const rootNodeModules = path.join(__dirname, 'node_modules');

module.exports = {
    ...nxPreset,
    moduleNameMapper: {
        ...nxPreset.moduleNameMapper,
        // Workaround: Jest doesn't resolve Angular Material ESM exports correctly
        '^@angular/material/(.*)$': `${rootNodeModules}/@angular/material/fesm2022/$1.mjs`,
    },
    coverageReporters: ['text', 'html', 'json-summary'],
    // Include all source in the denominator (relative to each project's rootDir),
    // so entirely untested files count as 0% instead of being silently omitted.
    // Excludes non-production code: specs, type decls, bootstrap, environments,
    // re-export barrels (index.ts), and test-support (secondary testing entry,
    // testing/ dirs, *.mock.ts) — none of which is executable production source.
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.spec.ts',
        '!src/**/*.d.ts',
        '!src/test-setup.ts',
        '!src/main.ts',
        '!src/main.server.ts',
        '!src/server.ts',
        '!src/environments/**',
        '!src/**/index.ts',
        '!src/testing.ts',
        '!src/**/testing/**',
        '!src/**/*.mock.ts',
    ],
    // coverageThreshold is defined per project in each jest.config.ts, calibrated
    // to that project's current coverage — denominators diverge too much for one
    // shared floor to protect the stronger projects. Ratchet: raise, never lower.
};
