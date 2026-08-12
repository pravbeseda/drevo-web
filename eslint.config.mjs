import nx from '@nx/eslint-plugin';
import noNull from 'eslint-plugin-no-null';
import importPlugin from 'eslint-plugin-import';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

// The full strict-type-checked rule set merged into one object, applied rules-only in the
// typed block below. Spreading the preset's config objects instead would re-register the
// @typescript-eslint plugin that nx flat/typescript already provides.
const strictTypeCheckedRules = Object.assign(
    {},
    ...tseslint.configs.strictTypeChecked.map(config => config.rules ?? {}),
);

// Shared across every block that needs type information. Flat config replaces
// `parserOptions` wholesale instead of merging, so each such block must carry the
// full object — hence one definition reused rather than two that can drift apart.
const typedParserOptions = {
    // Root-level config files belong to no tsconfig, and the project service
    // fails them with a parse error rather than skipping them.
    projectService: { allowDefaultProject: ['*.config.ts'] },
    tsconfigRootDir: import.meta.dirname,
};

// Every block that matches or exempts tests reuses these, so a narrower copy cannot
// silently reinstate a rule the base block turned off.
const specFiles = ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx'];

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
            // `use-unknown-in-catch-callback-variable` from strict-type-checked covers a native
            // `catch` and `Promise.catch`, and nothing else. RxJS types both of its error entry
            // points `any` — `catchError(selector: (err: any, ...))` and the observer's
            // `error: (err: any) => void` — so an unannotated parameter there silently inherits
            // `any` and carries it into everything derived from it. Annotating the parameter
            // (`unknown`, or a concrete type where the stream really guarantees one) is the fix.
            'no-restricted-syntax': [
                'error',
                {
                    // Pinned to `params.0`: the selector's other parameter, `caught: Observable<T>`,
                    // is typed honestly by RxJS and is the one that must not be annotated by hand.
                    selector:
                        "CallExpression[callee.name='catchError'] > ArrowFunctionExpression[params.0.type='Identifier']:not([params.0.typeAnnotation])",
                    message: 'Annotate the catchError parameter — RxJS types it `any`. Use `(err: unknown) =>`.',
                },
                {
                    // Anchored to the observer position — the argument of a `.subscribe()` — rather
                    // than to the property name, which on its own matches any object that happens to
                    // carry an `error` callback. Both function forms are covered: the method
                    // shorthand `error(err) {}` inherits the same `any` as the arrow.
                    selector:
                        "CallExpression[callee.property.name='subscribe'] > ObjectExpression > Property[key.name='error'] > :matches(ArrowFunctionExpression, FunctionExpression)[params.0.type='Identifier']:not([params.0.typeAnnotation])",
                    message:
                        'Annotate the subscribe error callback parameter — RxJS types it `any`. Use `(err: unknown) =>`.',
                },
            ],
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
            // The nx typescript preset ships this as a warning, which left the ban on `any`
            // resting on each project's shared `maxWarnings` budget rather than on a rule of
            // its own. The codebase has no violations, so error costs nothing and also reaches
            // the pre-commit hook, which passes no warning budget.
            '@typescript-eslint/no-explicit-any': 'error',
        },
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        // Roughly a quarter of the sonarjs set is type-aware and silently no-ops
        // without a program, so the parser gets one here.
        languageOptions: {
            parserOptions: typedParserOptions,
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
        ignores: specFiles,
        plugins: {
            'no-null': noNull,
        },
        rules: {
            'no-null/no-null': 'error',
        },
    },
    // Type-aware linting: the full `strict-type-checked` preset (issue #259), adopted after
    // measuring every rule against the codebase; each deviation below carries its reason.
    // Two house patterns predate the preset and remain intentional (#237): navigations are
    // marked `void` rather than awaited — their callers are synchronous handlers, and a
    // navigation that rejects reaches Sentry through the global unhandledrejection handler;
    // and a condition no-unnecessary-condition reports is fixed by making the type honest,
    // not by deleting the check.
    {
        files: ['**/*.ts', '**/*.tsx'],
        // Root config files (currently just jest.config.ts) belong to no tsconfig and land
        // in the default project, which has no strictNullChecks — several preset rules
        // refuse to run there. Excluding them beats an off-list that has to chase the
        // preset's growth for files no lint gate reaches anyway. Nested config files are
        // not affected: they belong to a real tsconfig and keep the full rule set.
        ignores: ['*.config.ts'],
        languageOptions: {
            parserOptions: typedParserOptions,
        },
        rules: {
            ...strictTypeCheckedRules,
            // The preset ships the plain 'error' form, which would drop the `_`-prefix
            // opt-out configured in the base block above.
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
            // Numbers interpolate everywhere here — ids in URLs, counts in log messages —
            // and stringifying a number is well-defined. The strict default bans it.
            '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
            // `() => this.doThing()` in event wiring returns void through the shorthand —
            // idiomatic, not a value mistaken for meaningful.
            '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
            // Angular components and directives are classes by contract, and a template-only
            // component is legitimately an empty one.
            '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
            // Every violation is `Validators.required` in a validators array — a static
            // method that Angular defines exactly for unbound use.
            '@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }],
            // The rule does not count type arguments at call sites as generic type arguments,
            // so it reports `output<void>()`, `StateEffect.define<void>()` and
            // `open<void, R>()` — the only void usages here, all legitimate.
            '@typescript-eslint/no-invalid-void-type': 'off',
        },
    },
    // Must follow the typed block above — flat config applies the last matching entry,
    // so an override placed with the other spec rules would be reinstated here.
    {
        files: specFiles,
        rules: {
            // Assertions deliberately re-check what the types already promise; that is the
            // point of a test, so the rule reports the test rather than a defect.
            '@typescript-eslint/no-unnecessary-condition': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            // `expect(spy.method)` hands the method over unbound by design — jest matchers
            // inspect it, they never call it. Virtually every assertion on a spy trips the
            // rule, so it is off for specs rather than suppressed per line.
            '@typescript-eslint/unbound-method': 'off',
        },
    },
];
