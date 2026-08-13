/**
 * Tests for the per-file coverage gate.
 *
 * The gate is run as a process, so it is tested as one: each case writes a coverage tree to a
 * temp directory, runs `node scripts/check-file-coverage.js <that directory>` and asserts on
 * the exit code and the output. That is the same entry point CI uses, so nothing is proven
 * about a shape the gate does not actually run in.
 *
 * Usage: yarn test:scripts   (node --test scripts/)
 */

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, describe, it } = require('node:test');

const repoRoot = path.join(__dirname, '..');
const gate = path.join(__dirname, 'check-file-coverage.js');
const tempRoots = [];

/** Writes one project's coverage-summary.json from `{ 'repo/relative/path.ts': pct }`. */
const writeCoverage = files => {
    const coverageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-gate-'));
    tempRoots.push(coverageRoot);

    const byProject = new Map();
    for (const [relativePath, pct] of Object.entries(files)) {
        // Both `apps/client` and `libs/*` are two segments, which is how the gate keys
        // PROJECT_FLOOR — the fixture derives the project the same way.
        const project = relativePath.split('/').slice(0, 2).join('/');
        const summary = byProject.get(project) ?? {};
        summary[path.join(repoRoot, relativePath)] = { statements: { pct } };
        byProject.set(project, summary);
    }

    for (const [project, summary] of byProject) {
        const projectDir = path.join(coverageRoot, project);
        fs.mkdirSync(projectDir, { recursive: true });
        fs.writeFileSync(path.join(projectDir, 'coverage-summary.json'), JSON.stringify(summary));
    }

    return coverageRoot;
};

const run = coverageRoot => {
    const result = spawnSync(process.execPath, [gate, coverageRoot], { encoding: 'utf8' });
    return { status: result.status, output: result.stdout + result.stderr };
};

after(() => {
    for (const root of tempRoots) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

describe('check-file-coverage', () => {
    it('fails and names a file below its project floor', () => {
        const { status, output } = run(writeCoverage({ 'libs/ui/src/lib/components/probe.ts': 12 }));

        assert.equal(status, 1);
        assert.match(output, /libs\/ui\/src\/lib\/components\/probe\.ts: 12% statements, floor 70%/);
    });

    it('passes a file exactly on the floor', () => {
        const { status } = run(writeCoverage({ 'libs/ui/src/lib/components/probe.ts': 70 }));

        assert.equal(status, 0);
    });

    it('applies the exception floor instead of the project floor', () => {
        // 30 is this file's own floor; the project floor is 70, so this proves which one won.
        const { status } = run(writeCoverage({ 'apps/client/src/app/features/article/article.routes.ts': 30 }));

        assert.equal(status, 0);
    });

    it('fails an exempt file that drops below its own floor', () => {
        const { status, output } = run(writeCoverage({ 'apps/client/src/app/features/article/article.routes.ts': 29 }));

        assert.equal(status, 1);
        assert.match(output, /article\.routes\.ts: 29% statements, floor 30%/);
    });

    it('reports an exception whose file has caught up, without failing', () => {
        const { status, output } = run(writeCoverage({ 'apps/client/src/app/features/article/article.routes.ts': 85 }));

        assert.equal(status, 0);
        assert.match(output, /no longer needed/);
        assert.match(output, /article\.routes\.ts: 85% now clears the 70% floor/);
    });

    it('skips a project the run did not measure rather than reading it as zero', () => {
        const { status, output } = run(writeCoverage({ 'libs/ui/src/lib/components/probe.ts': 90 }));

        assert.equal(status, 0);
        assert.match(output, /skipped, not measured in this run: apps\/client, libs\/core, libs\/shared, libs\/editor/);
        assert.match(output, /checked 1 of 5 projects/);
    });

    it('passes when nothing was measured at all', () => {
        // No entries means the loop that writes project directories never runs, so this is a
        // bare coverage root — and it goes through the same helper, so `after` removes it.
        const { status, output } = run(writeCoverage({}));

        assert.equal(status, 0);
        assert.match(output, /checked 0 of 5 projects/);
    });

    it('ignores the `total` entry of a summary', () => {
        const coverageRoot = writeCoverage({ 'libs/ui/src/lib/components/probe.ts': 90 });
        const summaryPath = path.join(coverageRoot, 'libs/ui/coverage-summary.json');
        const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
        summary.total = { statements: { pct: 3 } };
        fs.writeFileSync(summaryPath, JSON.stringify(summary));

        assert.equal(run(coverageRoot).status, 0);
    });
});
