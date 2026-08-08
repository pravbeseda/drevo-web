import path from 'node:path';

// ESLint runs only where CI already runs it: the Nx projects under apps/ and libs/, plus
// testing/, which belongs to no project and is linted by `yarn lint:playwright` instead.
// A hook stricter than CI is a hook people learn to skip with --no-verify, which drops
// prettier and stylelint too — so this list must not grow past what CI checks.
const ESLINT_ROOTS = ['apps', 'libs', 'testing'];

const isLintable = file => {
    const relative = path.relative(process.cwd(), file);
    return ESLINT_ROOTS.some(root => relative.startsWith(`${root}${path.sep}`));
};

const quote = files => files.map(file => JSON.stringify(file)).join(' ');

export default {
    '*.{ts,tsx,html}': files => {
        const tasks = [];
        const lintable = files.filter(isLintable);

        if (lintable.length > 0) {
            // The flag makes ESLint resolve the config from each file instead of from cwd,
            // which is what ESLint 10 does by default. Without it only the root config
            // applies, and it matches no **/*.html — every template would be skipped.
            tasks.push(`eslint --flag v10_config_lookup_from_file --fix --no-warn-ignored ${quote(lintable)}`);
        }

        tasks.push(`prettier --write ${quote(files)}`);

        return tasks;
    },
    '*.scss': ['stylelint --fix', 'prettier --write'],
    '!(*.scss|*.ts|*.tsx|*.html)': 'prettier --write --ignore-unknown',
};
