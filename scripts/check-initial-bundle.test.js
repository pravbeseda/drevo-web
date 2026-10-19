/**
 * Tests for the initial-bundle gate.
 *
 * Like the coverage gate, it is run as a process: each case writes an esbuild metafile to a
 * temp directory, runs `node scripts/check-initial-bundle.js <that file>` and asserts on the
 * exit code and the output.
 *
 * Usage: pnpm test:scripts   (node --test scripts/)
 */

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, describe, it } = require('node:test');

const gate = path.join(__dirname, 'check-initial-bundle.js');
const tempRoots = [];

const TABS = 'node_modules/.pnpm/@angular+material@22.2.0/node_modules/@angular/material/fesm2022/tabs.mjs';
const BUTTON = 'node_modules/.pnpm/@angular+material@22.2.0/node_modules/@angular/material/fesm2022/button.mjs';
const DIFF_MATCH_PATCH = 'node_modules/.pnpm/diff-match-patch@1.0.5/node_modules/diff-match-patch/index.js';

/** `{ 'file.js': { inputs: [...], imports: [{ path, kind }] } }` → a metafile on disk. */
const writeStats = outputs => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bundle-gate-'));
    tempRoots.push(root);

    const metafile = { inputs: {}, outputs: {} };
    for (const [file, { inputs = [], imports = [] }] of Object.entries(outputs)) {
        metafile.outputs[file] = {
            bytes: 1000,
            imports,
            inputs: Object.fromEntries(inputs.map(input => [input, { bytesInOutput: 100 }])),
        };
    }

    const statsPath = path.join(root, 'browser-stats.json');
    fs.writeFileSync(statsPath, JSON.stringify(metafile));
    return statsPath;
};

const run = statsPath => {
    const result = spawnSync(process.execPath, [gate, statsPath], { encoding: 'utf8' });
    return { status: result.status, output: result.stdout + result.stderr };
};

after(() => {
    for (const root of tempRoots) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

describe('check-initial-bundle', () => {
    it('fails and names a lazy-only module bundled into main', () => {
        const { status, output } = run(writeStats({ 'main-A.js': { inputs: [TABS] } }));

        assert.equal(status, 1);
        assert.match(output, /@angular\/material\/fesm2022\/tabs\.mjs/);
    });

    it('fails when the module sits in a chunk that main imports statically', () => {
        const { status, output } = run(
            writeStats({
                'main-A.js': { imports: [{ path: 'chunk-B.js', kind: 'import-statement' }] },
                'chunk-B.js': { inputs: [DIFF_MATCH_PATCH] },
            }),
        );

        assert.equal(status, 1);
        assert.match(output, /diff-match-patch\/index\.js/);
    });

    it('passes when the module is only in a dynamically imported chunk', () => {
        const { status, output } = run(
            writeStats({
                'main-A.js': { inputs: [BUTTON], imports: [{ path: 'chunk-B.js', kind: 'dynamic-import' }] },
                'chunk-B.js': { inputs: [TABS, DIFF_MATCH_PATCH] },
            }),
        );

        assert.equal(status, 0, output);
        assert.match(output, /initial bundle OK/);
    });

    it('fails with a hint when the stats file is missing', () => {
        const { status, output } = run(path.join(os.tmpdir(), 'no-such-dir', 'browser-stats.json'));

        assert.equal(status, 1);
        assert.match(output, /pnpm build/);
    });
});
