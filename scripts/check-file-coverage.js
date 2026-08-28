/**
 * Per-file coverage floor.
 *
 * `coverageThreshold.global` in each jest.config is an aggregate over hundreds of files, so a
 * PR that adds a wholly untested file passes it — the denominator absorbs the new zero. This
 * gate reads the same coverage run and checks each file on its own.
 *
 * It is a separate script rather than a glob key in `coverageThreshold` because the two cannot
 * coexist: Jest assigns every covered file to exactly one threshold group, so a glob that
 * covers a project empties `global`, and `@jest/reporters` then deliberately skips the global
 * check instead of failing it ("don't error when the global threshold group doesn't match any
 * files"). Adding the per-file floor there would have silently switched the aggregate off.
 *
 * Exceptions are listed by path, never by pattern. A category — "route files", "models" —
 * reads as though its members were declarations, and in this repository several of them hold
 * real logic. A name and a reason per file is what keeps that visible.
 *
 * Every exception floor sits on the file's measured figure, so an exempt file cannot regress
 * either; it ratchets like every other threshold here (CLAUDE.md, Quality rule 10).
 *
 * Usage: node scripts/check-file-coverage.js [path-to-coverage-root]
 */

const fs = require('fs');
const path = require('path');

const PROJECT_FLOOR = {
    'apps/client': 70,
    'libs/core': 85,
    'libs/shared': 70,
    'libs/ui': 70,
    'libs/editor': 55,
};

const EXCEPTIONS = {
    // Declaration-only: a routing table or a DI configuration, exercised by the Playwright
    // suite through real navigation rather than by a unit test.
    'apps/client/src/app/app.config.ts': 0,
    'apps/client/src/app/app.config.browser.ts': 0,
    'apps/client/src/app/app.config.server.ts': 0,
    'apps/client/src/app/app.routes.ts': 0,
    'apps/client/src/app/app.routes.server.ts': 0,
    'apps/client/src/app/features/history/history.routes.ts': 0,
    'apps/client/src/app/features/picture/picture.routes.ts': 0,
    'apps/client/src/app/features/calendar/calendar.routes.ts': 0,

    // Partially covered rather than untested: 178 lines with a spec of its own. The floor is
    // its measured figure, so it cannot regress while the rest is worked out in #267.
    'apps/client/src/app/features/article/article.routes.ts': 30,

    // Data tables and type declarations. `topic.ts` is deliberately absent from this list —
    // it holds two functions beside its table, and they are tested.
    'libs/shared/src/lib/models/calendar.ts': 0,
    'libs/shared/src/lib/models/review.ts': 0,
    'libs/shared/src/lib/models/user.ts': 0,
    'libs/ui/src/lib/constants/breakpoints.ts': 0,

    // Untested, and not for a structural reason — tracked in #267.
    'apps/client/src/app/features/history/pages/forum-history/forum-history.component.ts': 0,
    'apps/client/src/app/features/history/pages/news-history/news-history.component.ts': 0,
    'apps/client/src/app/features/history/resolvers/diff-title.resolver.ts': 0,

    // The IndexedDB layer: jsdom ships no implementation, so a unit test reaches the wrapper
    // around the calls and not the calls. Also #267.
    'libs/core/src/lib/logging/log-database.ts': 4,
    'libs/core/src/lib/draft-storage/draft-database.ts': 20,
    'libs/core/src/lib/logging/providers/indexed-db-log.provider.ts': 39,
    'libs/core/src/lib/logging/log-provider.interface.ts': 50,
};

const coverageRoot = process.argv[2] ?? path.join(__dirname, '..', 'coverage');
const repoRoot = path.join(__dirname, '..');

const violations = [];
const staleExceptions = [];
const skipped = [];

for (const [project, floor] of Object.entries(PROJECT_FLOOR)) {
    const summaryPath = path.join(coverageRoot, project, 'coverage-summary.json');

    // `nx affected` runs the tests of the affected projects only, so a missing summary means
    // "not measured in this run", not "nothing is covered".
    if (!fs.existsSync(summaryPath)) {
        skipped.push(project);
        continue;
    }

    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

    for (const [absolutePath, data] of Object.entries(summary)) {
        if (absolutePath === 'total') {
            continue;
        }

        const relativePath = path.relative(repoRoot, absolutePath);
        const measured = data.statements.pct;
        const exception = EXCEPTIONS[relativePath];
        const required = exception ?? floor;

        if (measured < required) {
            violations.push(`${relativePath}: ${measured}% statements, floor ${required}%`);
        }

        if (exception !== undefined && measured >= floor) {
            staleExceptions.push(`${relativePath}: ${measured}% now clears the ${floor}% floor`);
        }
    }
}

if (skipped.length > 0) {
    console.log(`skipped, not measured in this run: ${skipped.join(', ')}`);
}

if (staleExceptions.length > 0) {
    console.log('\nExceptions that are no longer needed — delete them from EXCEPTIONS:');
    for (const line of staleExceptions) {
        console.log(`  ${line}`);
    }
}

if (violations.length > 0) {
    console.error('\nFiles below their coverage floor:');
    for (const line of violations) {
        console.error(`  ${line}`);
    }
    console.error(
        '\nWrite the missing test. An exception is for a file nothing can test — add it to' +
            ' EXCEPTIONS in this script with the reason, and open an issue for it.',
    );
    process.exit(1);
}

const projectCount = Object.keys(PROJECT_FLOOR).length;
console.log(`per-file coverage floor OK (checked ${projectCount - skipped.length} of ${projectCount} projects)`);
