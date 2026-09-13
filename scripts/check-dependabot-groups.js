/**
 * Guards the group layout in .github/dependabot.yml.
 *
 * Dependabot does not put a dependency into the first group it matches, whatever
 * the docs say: it picks the most specific one. A group with no `patterns` scores
 * above any wildcard pattern, so a `dependency-type` group without them takes
 * `@angular/*` and `@nx/*` away from the groups that exist to move those sets in
 * one pull request (#361). The damage only shows in a real dependabot run, as a
 * lockstep set split across two PRs.
 *
 * Usage: node scripts/check-dependabot-groups.js [path-to-dependabot.yml]
 */

const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const configPath = process.argv[2] ?? path.join(__dirname, '..', '.github', 'dependabot.yml');

const updates = yaml.load(fs.readFileSync(configPath, 'utf8')).updates ?? [];
const failures = [];

const isNarrowWildcard = pattern => pattern !== '*' && pattern.includes('*');

for (const update of updates) {
    const groups = Object.entries(update.groups ?? {});
    const wildcardGroups = groups
        .filter(([, group]) => (group.patterns ?? []).some(isNarrowWildcard))
        .map(([name]) => name);

    if (wildcardGroups.length === 0) {
        continue;
    }

    for (const [name, group] of groups) {
        if (group.patterns === undefined) {
            failures.push(
                `${update['package-ecosystem']} group \`${name}\` declares no \`patterns\`, so it outranks ` +
                    `the wildcard patterns of ${wildcardGroups.map(g => `\`${g}\``).join(', ')} and takes their ` +
                    "dependencies — give it `patterns: ['*']`",
            );
        }
    }
}

if (failures.length > 0) {
    console.error(`${configPath}: a dependabot group lost its dependencies to another\n`);
    for (const failure of failures) {
        console.error(`  ✗ ${failure}`);
    }
    process.exit(1);
}

console.log(`${configPath}: dependabot groups OK`);
