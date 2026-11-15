/**
 * Tests for the pre-commit secret scan that `.husky/pre-commit` runs.
 *
 * Each case stages a file in a throwaway git repository and runs the script there as a process.
 * The token is generated at run time: a literal one in this file would trip the CI scan.
 *
 * Usage: pnpm test:scripts   (node --test scripts/)
 */

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, describe, it } = require('node:test');

const script = path.join(__dirname, 'scan-staged-secrets.sh');
const tempRoots = [];
// shortcut: the CI runner has no gitleaks, so the two scan cases run only locally; install it in cd-main-beta.yml if they ever need to gate a PR.
const hasGitleaks = spawnSync('gitleaks', ['version']).status === 0;
const needsGitleaks = { skip: !hasGitleaks && 'gitleaks is not installed' };
const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const GITHUB_TOKEN_BODY_LENGTH = 36;

const fakeGithubToken = () =>
    'ghp_' + [...crypto.randomBytes(GITHUB_TOKEN_BODY_LENGTH)].map(byte => BASE62[byte % BASE62.length]).join('');

const repoWithStagedFile = content => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-staged-secrets-'));
    tempRoots.push(root);
    spawnSync('git', ['init', '-q'], { cwd: root });
    fs.writeFileSync(path.join(root, 'config.js'), content);
    spawnSync('git', ['add', 'config.js'], { cwd: root });
    return root;
};

const run = (cwd, env = process.env) => {
    const result = spawnSync('/bin/sh', [script], { cwd, env, encoding: 'utf8' });
    return { status: result.status, output: result.stdout + result.stderr };
};

after(() => {
    for (const root of tempRoots) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

describe('scan-staged-secrets', () => {
    it('rejects a commit whose staged file holds a token', needsGitleaks, () => {
        const token = fakeGithubToken();
        const { status, output } = run(repoWithStagedFile(`const token = '${token}';\n`));

        assert.equal(status, 1);
        assert.match(output, /github-pat/);
        assert.doesNotMatch(output, new RegExp(token));
    });

    it('lets a commit with clean staged files through', needsGitleaks, () => {
        const { status } = run(repoWithStagedFile("const greeting = 'hello';\n"));

        assert.equal(status, 0);
    });

    it('warns and lets the commit through when gitleaks is not installed', () => {
        const { status, output } = run(repoWithStagedFile("const greeting = 'hello';\n"), { PATH: '/nonexistent' });

        assert.equal(status, 0);
        assert.match(output, /gitleaks is not installed/);
        assert.match(output, /NOT scanned/);
    });
});
