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
 * It also prints what the initial bundle is made of, by package, and in CI writes that table to
 * the job summary (#464). A build that fails its budget writes no stats at all, so that is the
 * baseline to compare against: the summary of the last green run on `main`.
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
    'dexie/',
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

// `@scope/name` or `name` for a dependency, `apps/client` or `libs/ui` for workspace code.
const packageOf = input => {
    const modulePath = input.split('node_modules/').at(-1);
    const [first, second] = modulePath.split('/');
    return modulePath === input || first.startsWith('@') ? `${first}/${second}` : first;
};

// kB as Angular's build report and budgets count them: 1000 bytes, not 1024.
const kB = bytes => `${(bytes / 1000).toFixed(1)} kB`;

const leaks = [];
const bytesByPackage = new Map();
let initialBytes = 0;
const addBytes = (name, bytes) => bytesByPackage.set(name, (bytesByPackage.get(name) ?? 0) + bytes);
for (const file of initialFiles) {
    const { bytes, inputs } = outputs[file];
    initialBytes += bytes;
    // `bytesInOutput` is recorded before Angular's chunk optimizer rewrites the chunk, so it
    // overstates each module by a factor that differs per chunk; scale to the shipped size.
    const recordedBytes = Object.values(inputs).reduce((sum, input) => sum + input.bytesInOutput, 0);
    if (recordedBytes === 0) {
        addBytes('(no source module)', bytes);
    }
    for (const [input, { bytesInOutput }] of Object.entries(inputs)) {
        const modulePath = input.split('node_modules/').at(-1);
        if (modulePath !== input && LAZY_ONLY.some(lazy => modulePath.startsWith(lazy))) {
            leaks.push(`${modulePath} (in ${file})`);
        }
        addBytes(packageOf(input), (bytesInOutput * bytes) / recordedBytes);
    }
}

const size = `${kB(initialBytes)} raw JS in ${initialFiles.size} files`;
const composition = [...bytesByPackage].sort(([, a], [, b]) => b - a);

console.log(`Initial bundle by package (${size}):`);
for (const [name, bytes] of composition) {
    console.log(`  ${kB(bytes).padStart(10)}  ${name}`);
}

if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = composition.map(([name, bytes]) => `| ${name} | ${kB(bytes)} |`);
    fs.appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        [`### Initial bundle by package (${size})`, '', '| Package | Size |', '| --- | ---: |', ...rows, ''].join('\n'),
    );
}

if (leaks.length > 0) {
    console.error('\nLazy-only modules in the initial bundle:');
    for (const line of leaks) {
        console.error(`  ${line}`);
    }
    console.error(
        '\nSomething eager imports them, directly or through a library barrel that re-exports them.' +
            ' Import the concrete entry point (`@drevo-web/ui/<folder>`) or load the module with' +
            ' `import()` — see docs/architecture.md.',
    );
    process.exit(1);
}

console.log('\ninitial bundle OK: no lazy-only module in it');
