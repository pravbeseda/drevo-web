import { validateWikiContent } from './validate-wiki-content';
import { Diagnostic, linter, lintGutter, lintKeymap } from '@codemirror/lint';
import { EditorView, keymap } from '@codemirror/view';

function wikiLintSource(view: EditorView): readonly Diagnostic[] {
    return validateWikiContent(view.state.doc.toString()).map(err => ({
        from: err.from,
        to: err.to,
        severity: err.severity,
        message: err.message,
    }));
}

export const wikiLinter = linter(wikiLintSource);
export const wikiLintGutter = lintGutter();
export const wikiLintKeymap = keymap.of(lintKeymap);
