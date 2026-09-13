/**
 * Guards the major of @types/node against the Node runtime the project supports.
 *
 * The typings describe one Node major. Typings above the lowest major `engines` accepts
 * type-check calls that crash on that runtime, and every other gate stays green — Dependabot
 * offered exactly such a bump in #368. `.github/dependabot.yml` ignores @types/node majors, so
 * the two only move by hand, and this check keeps them together when they do.
 *
 * Usage: node scripts/check-node-types.js [path-to-package.json]
 */

const fs = require('fs');
const path = require('path');

const manifestPath = process.argv[2] ?? path.join(__dirname, '..', 'package.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const leadingMajor = range => Number(range.match(/\d+/)?.[0]);

const engines = manifest.engines?.node;
const typesVersion = manifest.devDependencies?.['@types/node'] ?? manifest.dependencies?.['@types/node'];

if (engines === undefined || typesVersion === undefined) {
    console.error(`${manifestPath}: needs both \`engines.node\` and a \`@types/node\` dependency to compare`);
    process.exit(1);
}

const floor = Math.min(...engines.split('||').map(leadingMajor));
const typesMajor = leadingMajor(typesVersion);

if (typesMajor !== floor) {
    console.error(
        `${manifestPath}: \`@types/node\` ${typesVersion} is major ${typesMajor}, but the engines floor is ` +
            `Node ${floor} (\`${engines}\`) — use the latest @types/node ${floor}.x`,
    );
    process.exit(1);
}

console.log(`${manifestPath}: @types/node matches the Node ${floor} engines floor`);
