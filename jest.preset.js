const nxPreset = require('@nx/jest/preset').default;
const path = require('path');

const rootNodeModules = path.join(__dirname, 'node_modules');

module.exports = {
    ...nxPreset,
    moduleNameMapper: {
        ...nxPreset.moduleNameMapper,
        '^@angular/material/(.*)$': `${rootNodeModules}/@angular/material/fesm2022/$1.mjs`,
    },
};
