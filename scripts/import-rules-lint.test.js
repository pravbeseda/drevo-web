/**
 * Tests that the import rules in eslint.config.mjs still run on the installed ESLint.
 *
 * A clean codebase gives them nothing to report, so a plugin that crashes on its first finding
 * passes `nx lint` everywhere — eslint-plugin-import 2.32 did exactly that on ESLint 10, and only
 * the first misordered import in a commit would have shown it (#534).
 *
 * Usage: pnpm test:scripts   (node --test scripts/)
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const { describe, it } = require('node:test');
const { ESLint } = require('eslint');

const repoRoot = path.join(__dirname, '..');
// Not on disk: lintText only needs a path the import rules' block matches.
const filePath = path.join(repoRoot, 'apps/client/src/app/import-rules-probe.js');

const misordered = ["import { b } from './b';", "import { a } from './a';", "import { c } from './a';", ''].join('\n');

const lint = async options => {
    const [result] = await new ESLint({ cwd: repoRoot, ...options }).lintText(misordered, { filePath });
    return result;
};

describe('import rules', () => {
    it('report a misordered and a duplicate import', async () => {
        const { messages } = await lint();
        const ruleIds = messages.map(message => message.ruleId);

        assert.deepEqual(
            messages.filter(message => message.fatal),
            [],
        );
        assert.ok(ruleIds.includes('import-x/order'), `no import-x/order in ${JSON.stringify(ruleIds)}`);
        assert.ok(
            ruleIds.includes('import-x/no-duplicates'),
            `no import-x/no-duplicates in ${JSON.stringify(ruleIds)}`,
        );
    });

    it('fix the order', async () => {
        const { output } = await lint({ fix: true });

        assert.ok(output, 'nothing was fixed');
        assert.ok(output.indexOf("from './a'") < output.indexOf("from './b'"), output);
    });
});
