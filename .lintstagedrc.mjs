import path from 'node:path';

// ESLint runs only where CI already runs it: the Nx projects under apps/ and libs/.
// testing/playwright belongs to no project, so `nx lint` has never covered it and it
// carries errors nothing in a diff introduced (issues #242-#244). A hook stricter than
// CI is a hook people learn to skip with --no-verify, which drops prettier and stylelint
// too. Prettier still formats those files below — only the lint gate is scoped.
const ESLINT_ROOTS = ['apps', 'libs'];

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
