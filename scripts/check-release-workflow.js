/**
 * Guards the shape of the release job graph in cd-main-release.yml.
 *
 * The release pipeline has two invariants that no test can observe from the
 * outside — they only ever fail on a real tag push, in production:
 *
 *   1. Every release path passes the guards. A `!failure()` condition accepts a
 *      *skipped* dependency, so a guard job that never ran used to read as one
 *      that passed.
 *   2. The commit the guards inspected is the commit that gets tagged. Two jobs
 *      resolving `main` separately are two different moments in time.
 *
 * Both have regressed once already (#248 and its first fix), which is why they
 * are asserted here rather than left to review.
 *
 * Usage: node scripts/check-release-workflow.js [path-to-workflow]
 */

const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const workflowPath = process.argv[2] ?? path.join(__dirname, '..', '.github', 'workflows', 'cd-main-release.yml');

const jobs = yaml.load(fs.readFileSync(workflowPath, 'utf8')).jobs;
const failures = [];

const check = (description, condition) => {
    if (!condition) {
        failures.push(description);
    }
};

const guards = jobs.guards;
const computeVersion = jobs['compute-version'];
const release = jobs.release;

check('a `guards` job exists', Boolean(guards));
check('a `compute-version` job exists', Boolean(computeVersion));
check('a `release` job exists', Boolean(release));

if (guards && computeVersion && release) {
    check(
        '`guards` carries no trigger condition, so both the dispatch and the tag-push path run it',
        guards.if === undefined,
    );

    check(
        '`guards` publishes the commit it inspected as an output',
        /steps\.\w+\.outputs\.sha/.test(guards.outputs?.sha ?? ''),
    );

    const computeVersionCheckout = (computeVersion.steps ?? []).find(step =>
        (step.uses ?? '').startsWith('actions/checkout'),
    );
    check(
        '`compute-version` checks out the guarded commit instead of resolving `main` again',
        /needs\.guards\.outputs\.sha/.test(computeVersionCheckout?.with?.ref ?? ''),
    );

    const releaseNeeds = [release.needs ?? []].flat();
    check('`release` depends on `guards`', releaseNeeds.includes('guards'));

    const releaseIf = release.if ?? '';
    check(
        "`release` requires `needs.guards.result == 'success'`",
        /needs\.guards\.result\s*==\s*'success'/.test(releaseIf),
    );
    check(
        '`release` does not gate on `!failure()`, which also accepts a skipped guard',
        !/!\s*failure\(\)/.test(releaseIf),
    );
}

if (failures.length > 0) {
    console.error(`${workflowPath}: the release job graph lost an invariant\n`);
    for (const failure of failures) {
        console.error(`  ✗ ${failure}`);
    }
    process.exit(1);
}

console.log(`${workflowPath}: release job graph OK`);
