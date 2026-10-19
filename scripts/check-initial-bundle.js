/**
 * Initial-bundle gate: modules that only lazy routes use must not load at startup.
 *
 * esbuild assigns a file to chunks by file-level reachability from each entry point, following
 * every `export … from` of a barrel — tree shaking only decides which code survives, not where
 * it goes. One eager import of a library barrel is enough to move every lazy-only module that
 * barrel re-exports into a chunk `main` imports statically (#461). The bundle still builds and
 * every test passes; only the initial size grows. This gate reads the esbuild metafile that the
 * production build writes and fails when a known lazy-only module sits in the initial chunks.
 *
 * The list names concrete modules the layout never renders, each one found in the initial
 * bundle once already — not a category. Add a module when a new leak is found.
 *
 * Usage: node scripts/check-initial-bundle.js [path-to-browser-stats.json]
 */

const fs = require('fs');
const path = require('path');

// Matched against the part of an input path after its last `node_modules/`.
const LAZY_ONLY = [
    '@angular/material/fesm2022/tabs.mjs',
    '@angular/material/fesm2022/checkbox.mjs',
    '@angular/material/fesm2022/slide-toggle.mjs',
    '@angular/material/fesm2022/button-toggle.mjs',
    '@angular/material/fesm2022/input.mjs',
    'diff/',
    'diff-match-patch/',
];

const statsPath = process.argv[2] ?? path.join(__dirname, '..', 'dist', 'apps', 'client', 'browser-stats.json');

if (!fs.existsSync(statsPath)) {
    console.error(`${statsPath} not found — run \`pnpm build\` first; it writes the stats file.`);
    process.exit(1);
}

const { outputs } = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
const mainFile = Object.keys(outputs).find(file => /^main-[^/]*\.js$/.test(file));

const initialFiles = new Set();
const collect = file => {
    if (initialFiles.has(file)) {
        return;
    }
    initialFiles.add(file);
    for (const { path: imported, kind } of outputs[file].imports) {
        if (kind === 'import-statement') {
            collect(imported);
        }
    }
};
collect(mainFile);

const leaks = [];
let initialBytes = 0;
for (const file of initialFiles) {
    initialBytes += outputs[file].bytes;
    for (const input of Object.keys(outputs[file].inputs)) {
        const modulePath = input.split('node_modules/').at(-1);
        if (modulePath !== input && LAZY_ONLY.some(lazy => modulePath.startsWith(lazy))) {
            leaks.push(`${modulePath} (in ${file})`);
        }
    }
}

const size = `${(initialBytes / 1024).toFixed(1)} kB raw in ${initialFiles.size} files`;

if (leaks.length > 0) {
    console.error(`Lazy-only modules in the initial bundle (${size}):`);
    for (const line of leaks) {
        console.error(`  ${line}`);
    }
    console.error(
        '\nSomething eager imports a library entry point that re-exports them. Import the' +
            ' concrete entry point (`@drevo-web/ui/<folder>`) instead — see docs/architecture.md.',
    );
    process.exit(1);
}

console.log(`initial bundle OK (${size})`);
