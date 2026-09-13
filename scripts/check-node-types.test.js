/**
 * Tests for the @types/node gate.
 *
 * Like the other gates, it is run as a process: each case writes a package.json to a temp
 * directory, runs `node scripts/check-node-types.js <that file>` and asserts on the exit code
 * and the output.
 *
 * Usage: yarn test:scripts   (node --test scripts/)
 */

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, describe, it } = require('node:test');

const gate = path.join(__dirname, 'check-node-types.js');
const tempRoots = [];
const ENGINES = '^22.22.3 || ^24.15.0 || >=26.0.0';

const writeManifest = manifest => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'node-types-gate-'));
    tempRoots.push(root);
    const manifestPath = path.join(root, 'package.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    return manifestPath;
};

const run = manifestPath => {
    const result = spawnSync(process.execPath, [gate, manifestPath], { encoding: 'utf8' });
    return { status: result.status, output: result.stdout + result.stderr };
};

after(() => {
    for (const root of tempRoots) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

describe('check-node-types', () => {
    it('fails when @types/node is a major above the lowest Node that engines accepts', () => {
        const { status, output } = run(
            writeManifest({ engines: { node: ENGINES }, devDependencies: { '@types/node': '26.5.1' } }),
        );

        assert.equal(status, 1);
        assert.match(output, /`@types\/node` 26\.5\.1 is major 26.*engines floor is Node 22/);
    });

    it('fails when @types/node is a major below the engines floor', () => {
        const { status, output } = run(
            writeManifest({ engines: { node: ENGINES }, devDependencies: { '@types/node': '18.16.9' } }),
        );

        assert.equal(status, 1);
        assert.match(output, /major 18.*Node 22/);
    });

    it('passes when the @types/node major equals the engines floor, whatever the range operator', () => {
        for (const version of ['22.20.2', '^22.0.0', '~22.20.0']) {
            const { status, output } = run(
                writeManifest({ engines: { node: ENGINES }, devDependencies: { '@types/node': version } }),
            );

            assert.equal(status, 0, `${version}: ${output}`);
        }
    });

    it('fails rather than passing silently when engines or @types/node is missing', () => {
        const noEngines = run(writeManifest({ devDependencies: { '@types/node': '22.20.2' } }));
        const noTypes = run(writeManifest({ engines: { node: ENGINES } }));

        assert.equal(noEngines.status, 1);
        assert.match(noEngines.output, /engines\.node/);
        assert.equal(noTypes.status, 1);
        assert.match(noTypes.output, /@types\/node/);
    });

    it("passes the repository's own package.json", () => {
        const { status, output } = run(path.join(__dirname, '..', 'package.json'));

        assert.equal(status, 0, output);
    });
});
