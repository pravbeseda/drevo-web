const packageJson = require('../package.json');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const commit = execSync('git rev-parse --short HEAD').toString().trim();
const version = process.env.VERSION || packageJson.version;

const versionInfo = {
    version,
    buildTime: new Date().toISOString(),
    commit,
};

const outputPath = 'apps/client/src/assets/version.json';
const outputDir = path.dirname(outputPath);

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// eslint-disable-next-line no-null/no-null
fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));

console.log('Generated version.json:', versionInfo);
