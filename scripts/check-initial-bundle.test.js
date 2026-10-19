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
const FORMS =
    'node_modules/.pnpm/@angular+forms@22.2.2_@angular+core@22.2.2/node_modules/@angular/forms/fesm2022/forms.mjs';
const RXJS = 'node_modules/.pnpm/rxjs@7.8.2/node_modules/rxjs/dist/esm5/internal/Observable.js';
const DIFF_MATCH_PATCH = 'node_modules/.pnpm/diff-match-patch@1.0.5/node_modules/diff-match-patch/index.js';

/** `{ 'file.js': { bytes, inputs: [path | [path, bytes]], imports: [{ path, kind }] } }` → a metafile on disk. */
const writeStats = outputs => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bundle-gate-'));
    tempRoots.push(root);

    const metafile = { inputs: {}, outputs: {} };
    for (const [file, { bytes = 1000, inputs = [], imports = [] }] of Object.entries(outputs)) {
        metafile.outputs[file] = {
            bytes,
            imports,
            inputs: Object.fromEntries(
                inputs.map(input => {
                    const [inputPath, bytes] = Array.isArray(input) ? input : [input, 100];
                    return [inputPath, { bytesInOutput: bytes }];
                }),
            ),
        };
    }

    const statsPath = path.join(root, 'browser-stats.json');
    fs.writeFileSync(statsPath, JSON.stringify(metafile));
    return statsPath;
};

const run = (statsPath, env = {}) => {
    const result = spawnSync(process.execPath, [gate, statsPath], {
        encoding: 'utf8',
        env: { ...process.env, GITHUB_STEP_SUMMARY: '', ...env },
    });
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

    it('lists the initial bundle by package, largest first, scoped packages and workspace projects included', () => {
        const { status, output } = run(
            writeStats({
                'main-A.js': {
                    inputs: [
                        ['apps/client/src/main.ts', 3000],
                        ['libs/ui/src/lib/components/icon/icon.component.ts', 2000],
                        [RXJS, 5000],
                    ],
                    imports: [
                        { path: 'chunk-B.js', kind: 'import-statement' },
                        { path: 'chunk-C.js', kind: 'dynamic-import' },
                    ],
                },
                'chunk-B.js': {
                    inputs: [
                        [FORMS, 4000],
                        [BUTTON, 6000],
                    ],
                },
                'chunk-C.js': { inputs: [[TABS, 50000]] },
            }),
        );

        assert.equal(status, 0, output);
        const rows = output.split('\n').filter(line => /^\s+\d/.test(line));
        assert.deepEqual(
            rows.map(row => row.trim().split(/\s+/).at(-1)),
            ['@angular/material', 'rxjs', '@angular/forms', 'apps/client', 'libs/ui'],
        );
    });

    it('scales each module to the bytes its chunk really has, so the rows add up to the shipped size', () => {
        // The chunk optimizer rewrites the chunks after esbuild records `bytesInOutput`, which
        // then overstates every module by a different factor per chunk.
        const { status, output } = run(
            writeStats({
                'main-A.js': {
                    bytes: 3000,
                    inputs: [
                        [RXJS, 2000],
                        [FORMS, 4000],
                    ],
                    imports: [{ path: 'chunk-B.js', kind: 'import-statement' }],
                },
                'chunk-B.js': { bytes: 1500, inputs: [] },
            }),
        );

        assert.equal(status, 0, output);
        assert.match(output, /\(4\.5 kB raw JS in 2 files\)/);
        assert.match(output, /2\.0 kB {2}@angular\/forms/);
        assert.match(output, /1\.5 kB {2}\(no source module\)/);
        assert.match(output, /1\.0 kB {2}rxjs/);
    });

    it('writes the same breakdown to the GitHub job summary when CI provides one', () => {
        const summary = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bundle-summary-')), 'summary.md');
        tempRoots.push(path.dirname(summary));

        const { status, output } = run(writeStats({ 'main-A.js': { bytes: 5000, inputs: [[RXJS, 5000]] } }), {
            GITHUB_STEP_SUMMARY: summary,
        });

        assert.equal(status, 0, output);
        assert.match(fs.readFileSync(summary, 'utf8'), /\| rxjs \| 5\.0 kB \|/);
    });

    it('fails with a hint when the stats file is missing', () => {
        const { status, output } = run(path.join(os.tmpdir(), 'no-such-dir', 'browser-stats.json'));

        assert.equal(status, 1);
        assert.match(output, /pnpm build/);
    });
});
