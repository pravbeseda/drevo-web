/**
 * Tests for the trace mode of the Playwright config.
 *
 * `isCI` is read once, when the config module loads, so each environment is loaded in a process
 * of its own — the same way Playwright loads it.
 *
 * Usage: pnpm test:scripts   (node --test scripts/)
 */

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { describe, it } = require('node:test');

const repoRoot = path.join(__dirname, '..');

/** The `use.trace` the config resolves to under the given value of `CI`. */
const traceMode = ci => {
    const env = { ...process.env, CI: ci };
    const result = spawnSync(
        process.execPath,
        [
            '--no-warnings',
            '--input-type=module',
            '-e',
            "const { default: config } = await import('./testing/playwright/playwright.config.ts');" +
                'process.stdout.write(config.use.trace);',
        ],
        { cwd: repoRoot, encoding: 'utf8', env },
    );
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
};

describe('Playwright trace mode', () => {
    it('keeps the trace of a failed test locally, where nothing is retried (#480)', () => {
        assert.equal(traceMode(''), 'retain-on-failure');
    });

    it('records the trace on the first retry in CI', () => {
        assert.equal(traceMode('true'), 'on-first-retry');
    });
});
