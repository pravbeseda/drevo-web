import { EditorView } from '@codemirror/view';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { DiffEngine } from '@drevo-web/shared/diff';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { CmDiffEditorComponent } from './cm-diff-editor.component';

const OLD = 'первая строка\nстарая строка';
const NEW = 'первая строка\nновая строка с ошибкой';
const ERROR_FROM = NEW.indexOf('ошибкой');
const ERROR = { from: ERROR_FROM, to: ERROR_FROM + 'ошибкой'.length };
const FIRST = { from: 0, to: 'первая'.length };
const WHOLE_TEXT: DiffEngine = {
    computeDiff: (a, b) => [
        { type: 'delete', text: a },
        { type: 'insert', text: b },
    ],
};

describe('CmDiffEditorComponent', () => {
    let spectator: Spectator<CmDiffEditorComponent>;

    const createComponent = createComponentFactory({
        component: CmDiffEditorComponent,
        providers: [mockLoggerProvider()],
        detectChanges: false,
    });

    const marks = (root: Element = spectator.element): readonly string[] =>
        Array.from(root.querySelectorAll('.cm-finding'), el => el.textContent ?? '');

    beforeEach(() => {
        spectator = createComponent({ props: { oldText: OLD, newText: NEW } });
    });

    it('should show only the new text in source mode', () => {
        spectator.setInput('mode', 'source');
        spectator.detectChanges();

        expect(spectator.queryAll('.cm-editor')).toHaveLength(1);
        expect(spectator.query('.cm-mergeView')).toBeNull();
        expect(spectator.query('.cm-deletedChunk')).toBeNull();
        expect(spectator.query('.cm-content')?.textContent).toBe('первая строкановая строка с ошибкой');
    });

    it('should not collapse unchanged lines when asked not to', () => {
        const unchanged = Array.from({ length: 12 }, (_, i) => `строка ${i + 1}`).join('\n');
        spectator.setInput({
            oldText: `${unchanged}\nстарое`,
            newText: `${unchanged}\nновое`,
            collapseUnchanged: false,
        });
        spectator.detectChanges();

        expect(spectator.query('.cm-collapsedLines')).toBeNull();
    });

    it('should mark the findings in the current text', () => {
        spectator.setInput('marks', [FIRST, ERROR]);
        spectator.detectChanges();

        expect(marks()).toEqual(['первая', 'ошибкой']);
    });

    it('should update the marks without rebuilding the editor', () => {
        spectator.detectChanges();
        const editor = spectator.query('.cm-editor');

        spectator.setInput('marks', [ERROR]);
        spectator.detectChanges();

        expect(spectator.query('.cm-editor')).toBe(editor);
        expect(marks()).toEqual(['ошибкой']);
    });

    it('should mark only the right column side by side', () => {
        spectator.setInput({ mode: 'side-by-side', marks: [FIRST] });
        spectator.detectChanges();

        const [left, right] = spectator.queryAll('.cm-editor');
        expect(marks(left)).toEqual([]);
        expect(marks(right)).toEqual(['первая']);
    });

    it('should keep the marks across a mode change', () => {
        spectator.setInput('marks', [ERROR]);
        spectator.detectChanges();

        spectator.setInput('mode', 'source');
        spectator.detectChanges();

        expect(marks()).toEqual(['ошибкой']);
    });

    it('should highlight the focused finding and scroll to it', () => {
        const scrollIntoView = jest.spyOn(EditorView, 'scrollIntoView');
        spectator.setInput({ marks: [FIRST, ERROR], focused: ERROR });
        spectator.detectChanges();

        expect(Array.from(spectator.queryAll('.cm-finding-focused'), el => el.textContent)).toEqual(['ошибкой']);
        expect(scrollIntoView).toHaveBeenCalledWith(ERROR.from, { y: 'center' });
    });

    describe('with a diff engine', () => {
        const deleted = (): string =>
            spectator
                .queryAll('.cm-deletedChunk, .cm-deletedText')
                .map(el => el.textContent)
                .join('');

        it("should draw CodeMirror's own diff without one", () => {
            spectator.detectChanges();

            expect(deleted()).toBe('старая');
        });

        it('should draw the changes the engine found', () => {
            spectator.setInput('engine', WHOLE_TEXT);
            spectator.detectChanges();

            expect(deleted()).toContain('первая строка');
        });

        it('should redraw the diff when the engine changes', () => {
            spectator.detectChanges();

            spectator.setInput('engine', WHOLE_TEXT);
            spectator.detectChanges();

            expect(deleted()).toContain('первая строка');
        });
    });
});
