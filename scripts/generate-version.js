const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const commit = execSync('git rev-parse --short HEAD').toString().trim();
const version = process.env.APP_VERSION || process.env.VERSION || 'dev';

const versionInfo = {
    version,
    buildTime: new Date().toISOString(),
    commit,
};

const versionJsonPath = 'apps/client/public/version.json';
const buildInfoPath = 'apps/client/src/app/shared/build-info.ts';

for (const outputPath of [versionJsonPath, buildInfoPath]) {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
}

// eslint-disable-next-line no-null/no-null
fs.writeFileSync(versionJsonPath, JSON.stringify(versionInfo, null, 2));
fs.writeFileSync(
    buildInfoPath,
    `// Default development fallback for fresh checkouts.\n// Updated by scripts/generate-version.js before build and serve.\nexport const BUILD_INFO = {\n    version: '${version}',\n} as const;\n`,
);

console.log('Generated version.json:', versionInfo);
console.log('Generated build-info.ts:', { version });
