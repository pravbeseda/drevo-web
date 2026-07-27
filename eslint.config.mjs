import nx from '@nx/eslint-plugin';
import noNull from 'eslint-plugin-no-null';
import importPlugin from 'eslint-plugin-import';
import sonarjs from 'eslint-plugin-sonarjs';

export default [
    ...nx.configs['flat/base'],
    ...nx.configs['flat/typescript'],
    ...nx.configs['flat/javascript'],
    {
        ignores: ['**/dist'],
    },
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
        plugins: {
            import: importPlugin,
        },
        rules: {
            'import/no-duplicates': 'error',
            'import/order': [
                'error',
                {
                    groups: [['builtin', 'external', 'internal', 'parent', 'sibling', 'index']],
                    'newlines-between': 'never',
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                },
            ],
            '@nx/enforce-module-boundaries': [
                'error',
                {
                    enforceBuildableLibDependency: true,
                    allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?js$'],
                    depConstraints: [
                        {
                            sourceTag: '*',
                            onlyDependOnLibsWithTags: ['*'],
                        },
                    ],
                },
            ],
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    vars: 'all',
                    args: 'after-used',
                    ignoreRestSiblings: true,
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-non-null-assertion': 'error',
        },
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        // Roughly a quarter of the sonarjs set is type-aware and silently no-ops
        // without a program, so the parser gets one here.
        languageOptions: {
            parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
        },
        plugins: {
            sonarjs,
        },
        rules: {
            ...sonarjs.configs.recommended.rules,
            // Does not honour strict null checks or narrowing — flags plain `string`
            // params and values already guarded one line above. TS covers this.
            'sonarjs/null-dereference': 'off',
            // Fails to resolve `Array<T>.includes`, reporting the literal type parameter
            // ("expected 'T' instead of 'string'") on correctly typed calls.
            'sonarjs/argument-type': 'off',
            // Rejects union returns, which are idiomatic here: `T | undefined` is the
            // house style for absence, and `CanActivateFn` returns value-or-Observable.
            'sonarjs/function-return-type': 'off',
            // Redundant with `@typescript-eslint/no-unused-vars` above, and it double-reports
            // on the same line. It also does not honour that rule's `varsIgnorePattern: '^_'`,
            // so it would break the `_`-prefix opt-out for deliberately unused variables.
            // `sonarjs/no-dead-store` stays on — it catches overwritten assignments, which
            // the typescript-eslint rule does not report.
            'sonarjs/no-unused-vars': 'off',
        },
    },
    {
        files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
        rules: {
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            'import/order': 'off',
            // sonarjs rules whose findings are inherent to test code: fixture URLs and
            // credentials, assertion style, float comparisons. Everything else — including
            // cognitive-complexity, no-duplicate-string and no-identical-functions — stays on.
            'sonarjs/assertions-in-tests': 'off',
            'sonarjs/no-clear-text-protocols': 'off',
            'sonarjs/no-floating-point-equality': 'off',
            'sonarjs/no-hardcoded-passwords': 'off',
            'sonarjs/parameterized-tests': 'off',
            'sonarjs/prefer-specific-assertions': 'off',
        },
    },
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts', '**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'],
        ignores: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
        plugins: {
            'no-null': noNull,
        },
        rules: {
            'no-null/no-null': 'error',
        },
    },
];
