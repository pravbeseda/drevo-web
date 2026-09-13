/**
 * Tests for the dependabot group gate.
 *
 * Like the coverage gate, it is run as a process: each case writes a dependabot.yml to a temp
 * directory, runs `node scripts/check-dependabot-groups.js <that file>` and asserts on the exit
 * code and the output.
 *
 * Usage: yarn test:scripts   (node --test scripts/)
 */

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, describe, it } = require('node:test');

const gate = path.join(__dirname, 'check-dependabot-groups.js');
const tempRoots = [];

const writeConfig = yamlText => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dependabot-gate-'));
    tempRoots.push(root);
    const configPath = path.join(root, 'dependabot.yml');
    fs.writeFileSync(configPath, yamlText);
    return configPath;
};

const run = configPath => {
    const result = spawnSync(process.execPath, [gate, configPath], { encoding: 'utf8' });
    return { status: result.status, output: result.stdout + result.stderr };
};

const npmUpdate = groups => `version: 2
updates:
    - package-ecosystem: npm
      directory: /
      schedule:
          interval: monthly
      groups:
${groups}
`;

after(() => {
    for (const root of tempRoots) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

describe('check-dependabot-groups', () => {
    it('fails and names each dependency-type group that has no patterns beside a wildcard group', () => {
        const { status, output } = run(
            writeConfig(
                npmUpdate(`          angular:
              patterns:
                  - '@angular/*'
          production-dependencies:
              dependency-type: production
          development-dependencies:
              dependency-type: development`),
            ),
        );

        assert.equal(status, 1);
        assert.match(output, /npm group `production-dependencies` declares no `patterns`.*`angular`/);
        assert.match(output, /npm group `development-dependencies` declares no `patterns`.*`angular`/);
    });

    it("passes when those groups carry `patterns: ['*']`", () => {
        const { status } = run(
            writeConfig(
                npmUpdate(`          angular:
              patterns:
                  - '@angular/*'
          production-dependencies:
              patterns:
                  - '*'
              dependency-type: production`),
            ),
        );

        assert.equal(status, 0);
    });

    it('passes a group without patterns when no group in that ecosystem uses a narrow wildcard', () => {
        // Exact names score above a pattern-less group and `'*'` is the lowest score of all,
        // so neither can lose a dependency to it.
        const { status } = run(
            writeConfig(
                npmUpdate(`          shared:
              patterns:
                  - 'tslib'
          everything:
              patterns:
                  - '*'
          production-dependencies:
              dependency-type: production`),
            ),
        );

        assert.equal(status, 0);
    });

    it("passes the repository's own dependabot.yml", () => {
        const { status, output } = run(path.join(__dirname, '..', '.github', 'dependabot.yml'));

        assert.equal(status, 0, output);
    });
});
