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
    // Ratchet floor applied per project. Set below the weakest project (editor)
    // with a small margin for run-to-run drift. Raise as coverage grows; never lower.
    coverageThreshold: {
        global: {
            lines: 70,
            branches: 55,
            functions: 55,
            statements: 70,
        },
    },
};
