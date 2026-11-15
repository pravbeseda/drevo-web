/**
 * Tests that lint rejects a public writable signal (Angular rule 2) outside specs, and that the
 * spec override keeps the RxJS `no-restricted-syntax` entries it shares with the base block.
 *
 * After #516 no source file declares one, so a lint run over the codebase cannot tell the
 * selector from a missing one; and no file breaks the RxJS entries either.
 *
 * Usage: pnpm test:scripts   (node --test scripts/)
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const { describe, it } = require('node:test');
const { ESLint } = require('eslint');

const repoRoot = path.join(__dirname, '..');
const eslint = new ESLint({ cwd: repoRoot });

const probe = [
    "import { linkedSignal, signal } from '@angular/core';",
    "import { catchError, EMPTY, of } from 'rxjs';",
    '',
    'export class Probe {',
    '    readonly implicitPublic = signal(0);',
    '    public explicitPublic = signal(0);',
    '    readonly linked = linkedSignal(() => 0);',
    '    readonly stream = of(0).pipe(catchError(err => EMPTY));',
    '}',
    '',
].join('\n');

// Type-aware parsing only accepts a file its tsconfig includes; lintText swaps in the probe's text.
const lintAs = async file => {
    const [{ messages }] = await eslint.lintText(probe, { filePath: path.join(repoRoot, file) });
    assert.deepEqual(
        messages.filter(message => message.fatal),
        [],
    );
    const restricted = messages.filter(message => message.ruleId === 'no-restricted-syntax');
    return {
        signalLines: restricted.filter(message => message.message.includes('Angular rule 2')).map(m => m.line),
        rxjsCount: restricted.filter(message => message.message.includes('RxJS types it')).length,
    };
};

describe('public writable signal rule', () => {
    it('reports every public signal and linkedSignal field in source code', async () => {
        const { signalLines, rxjsCount } = await lintAs('apps/client/src/test-setup.ts');

        assert.deepEqual(signalLines, [5, 6, 7]);
        assert.equal(rxjsCount, 1);
    });

    it('leaves test hosts in specs alone but keeps the RxJS entries there', async () => {
        const { signalLines, rxjsCount } = await lintAs('apps/client/src/app/app.component.spec.ts');

        assert.deepEqual(signalLines, []);
        assert.equal(rxjsCount, 1);
    });
});
