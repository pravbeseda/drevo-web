import nx from '@nx/eslint-plugin';
import noNull from 'eslint-plugin-no-null';
import importPlugin from 'eslint-plugin-import';

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
        files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
        rules: {
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            'import/order': 'off',
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
    // Type-aware linting (Этап 2 · Q3, Вариант B): high-value typed rules only.
    // projectService enables full type information; scoped to source TS.
    {
        files: ['**/*.ts', '**/*.tsx'],
        ignores: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // Clean at introduction — locked at error to guard new code.
            '@typescript-eslint/await-thenable': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            // Existing violations present — warning-first, promote to error after cleanup.
            // no-floating-promises: real unhandled promises (needs per-site await vs void review).
            // no-unnecessary-condition: mostly intentional guards against untyped backend data.
            '@typescript-eslint/no-floating-promises': 'warn',
            '@typescript-eslint/no-unnecessary-condition': 'warn',
        },
    },
];
