import { wikiLinter } from './wiki-linter';
import { Diagnostic, forceLinting, forEachDiagnostic } from '@codemirror/lint';
import { EditorView } from '@codemirror/view';

async function lint(doc: string): Promise<{ view: EditorView; diagnostics: Diagnostic[] }> {
    const view = new EditorView({ doc, extensions: [wikiLinter] });
    forceLinting(view);
    // The lint source result is dispatched once its promise settles.
    await new Promise(resolve => setTimeout(resolve));
    const diagnostics: Diagnostic[] = [];
    forEachDiagnostic(view.state, d => diagnostics.push(d));
    return { view, diagnostics };
}

describe('wikiLinter', () => {
    it('should offer a fix that replaces the fragment with the suggestion', async () => {
        const { view, diagnostics } = await lint('Это cвятой отец');
        const [diagnostic] = diagnostics;
        const [action] = diagnostic.actions ?? [];

        expect(action.name).toBe('Заменить на «святой»');

        action.apply(view, diagnostic.from, diagnostic.to);

        expect(view.state.doc.toString()).toBe('Это святой отец');
        view.destroy();
    });

    it('should offer no fix when the rule has no suggestion', async () => {
        const { view, diagnostics } = await lint('== Заголовок ((ссылка)) ==');

        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0].actions ?? []).toEqual([]);
        view.destroy();
    });
});
