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

const probe = strategy =>
    [
        "import { ChangeDetectionStrategy, Component } from '@angular/core';",
        '',
        '@Component({',
        "    selector: 'probe',",
        "    template: '',",
        `    changeDetection: ChangeDetectionStrategy.${strategy},`,
        '})',
        'export class ProbeComponent {}',
        '',
    ].join('\n');

const ruleIdsFor = async (project, strategy) => {
    // Type-aware parsing only accepts a file its tsconfig includes; lintText swaps in the probe's
    // text, and every Jest project has this file under its own eslint.config.mjs.
    const filePath = path.join(repoRoot, project, 'src/test-setup.ts');
    const [result] = await eslint.lintText(probe(strategy), { filePath });
    assert.deepEqual(
        result.messages.filter(message => message.fatal),
        [],
    );
    return result.messages.map(message => message.ruleId);
};

describe('change detection rule', () => {
    for (const project of angularProjects) {
        it(`${project} reports a component that opts out of OnPush`, async () => {
            const ruleIds = await ruleIdsFor(project, 'Eager');

            assert.ok(ruleIds.includes(rule), `no ${rule} in ${JSON.stringify(ruleIds)}`);
        });

        it(`${project} accepts an explicit OnPush`, async () => {
            const ruleIds = await ruleIdsFor(project, 'OnPush');

            assert.ok(!ruleIds.includes(rule), `${rule} reported an explicit OnPush`);
        });
    }
});
