/**
 * Tests that every Angular project's lint rejects a component that opts out of OnPush.
 *
 * Angular 22 makes OnPush the default, so the one way left to break Angular rule 3 is an explicit
 * `ChangeDetectionStrategy.Eager` (or its deprecated alias `Default`). No component does that today,
 * so a lint run over the codebase cannot tell an enabled rule from a missing one (#517).
 *
 * Usage: pnpm test:scripts   (node --test scripts/)
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const { describe, it } = require('node:test');
const { ESLint } = require('eslint');

const repoRoot = path.join(__dirname, '..');
const rule = '@angular-eslint/prefer-on-push-component-change-detection';
const angularProjects = ['apps/client', 'libs/core', 'libs/editor', 'libs/ui'];
const eslint = new ESLint({ cwd: repoRoot });

const optOut = [
    "import { ChangeDetectionStrategy, Component } from '@angular/core';",
    '',
    '@Component({',
    "    selector: 'probe',",
    "    template: '',",
    '    changeDetection: ChangeDetectionStrategy.Eager,',
    '})',
    'export class ProbeComponent {}',
    '',
].join('\n');

describe('change detection rule', () => {
    for (const project of angularProjects) {
        it(`${project} reports a component that opts out of OnPush`, async () => {
            // Type-aware parsing only accepts a file its tsconfig includes; lintText swaps in the
            // probe's text, and every Angular project has this file under its own eslint.config.mjs.
            const filePath = path.join(repoRoot, project, 'src/test-setup.ts');
            const [{ messages }] = await eslint.lintText(optOut, { filePath });
            const ruleIds = messages.map(message => message.ruleId);

            assert.deepEqual(
                messages.filter(message => message.fatal),
                [],
            );
            assert.ok(ruleIds.includes(rule), `no ${rule} in ${JSON.stringify(ruleIds)}`);
        });
    }
});
