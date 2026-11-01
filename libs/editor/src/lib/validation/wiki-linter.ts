import { ContentError } from './models/content-error.model';
import { validateWikiContent } from './validate-wiki-content';
import { Action, Diagnostic, linter, lintGutter, lintKeymap } from '@codemirror/lint';
import { EditorView, keymap } from '@codemirror/view';

function toFixActions({ suggestion }: ContentError): readonly Action[] {
    if (suggestion === undefined) return [];
    return [
        {
            name: `Заменить на «${suggestion}»`,
            apply: (view, from, to) => view.dispatch({ changes: { from, to, insert: suggestion } }),
        },
    ];
}

function wikiLintSource(view: EditorView): readonly Diagnostic[] {
    return validateWikiContent(view.state.doc.toString()).map(err => ({
        from: err.from,
        to: err.to,
        severity: err.severity,
        message: err.message,
        actions: toFixActions(err),
    }));
}

export const wikiLinter = linter(wikiLintSource);
export const wikiLintGutter = lintGutter();
export const wikiLintKeymap = keymap.of(lintKeymap);
