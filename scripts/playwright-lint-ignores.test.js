/**
 * Tests for what `pnpm lint:playwright` reads.
 *
 * A local run writes its report and traces under testing/playwright. Git ignores them, ESLint does
 * not read .gitignore, and the report bundles the trace viewer's minified JS — linting it fails
 * the gate with thousands of errors after any run that kept a trace (#498).
 *
 * Usage: pnpm test:scripts   (node --test scripts/)
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const { describe, it } = require('node:test');
const { ESLint } = require('eslint');

const repoRoot = path.join(__dirname, '..');

// The same flag as the lint:playwright script, so the nearest config is the one resolved.
const eslint = new ESLint({ cwd: repoRoot, flags: ['v10_config_lookup_from_file'] });

describe('lint:playwright ignores', () => {
    for (const generated of [
        'testing/playwright/playwright-report/trace/assets/index.js',
        'testing/playwright/test-results/some-test/trace/index.js',
        'testing/playwright/coverage/lcov-report/prettify.js',
    ]) {
        it(`skips ${generated}`, async () => {
            assert.equal(await eslint.isPathIgnored(generated), true);
        });
    }

    it('still lints the suite itself', async () => {
        assert.equal(await eslint.isPathIgnored('testing/playwright/tests/forum/forum-feed.spec.ts'), false);
    });
});
