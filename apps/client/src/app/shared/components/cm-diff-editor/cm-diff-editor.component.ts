import { cmDiffConfig } from '../../helpers/cm-diff-config';
import { isPlatformBrowser } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    effect,
    ElementRef,
    inject,
    input,
    OnDestroy,
    PLATFORM_ID,
    untracked,
    viewChild,
} from '@angular/core';
import { DiffConfig, MergeView, goToNextChunk, goToPreviousChunk, unifiedMergeView } from '@codemirror/merge';
import { EditorState, Extension, StateEffect, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, lineNumbers } from '@codemirror/view';
import { LoggerService } from '@drevo-web/core';
import type { DiffEngine } from '@drevo-web/shared/diff';

/** `source` shows the new text alone, without the diff. */
export type CmDiffMode = 'unified' | 'side-by-side' | 'source';

/** A range of the new text to mark. */
export interface CmMark {
    readonly from: number;
    readonly to: number;
}

interface MarkState {
    readonly marks: readonly CmMark[];
    readonly focused: CmMark | undefined;
}

const COLLAPSE_UNCHANGED = { margin: 3, minSize: 4 };

const setMarksEffect = StateEffect.define<MarkState>();
const markDecoration = Decoration.mark({ class: 'cm-finding' });
const focusedMarkDecoration = Decoration.mark({ class: 'cm-finding cm-finding-focused' });

function buildMarks(docLength: number, { marks, focused }: MarkState): DecorationSet {
    return Decoration.set(
        marks
            .filter(mark => mark.from < mark.to && mark.to <= docLength)
            .map(mark =>
                (mark.from === focused?.from && mark.to === focused.to ? focusedMarkDecoration : markDecoration).range(
                    mark.from,
                    mark.to,
                ),
            ),
        true,
    );
}

function marksField(initial: MarkState): Extension {
    return StateField.define<DecorationSet>({
        create: state => buildMarks(state.doc.length, initial),
        update: (marks, tr) => {
            const set = tr.effects.find(effect => effect.is(setMarksEffect));
            return set?.is(setMarksEffect) ? buildMarks(tr.state.doc.length, set.value) : marks.map(tr.changes);
        },
        provide: field => EditorView.decorations.from(field),
    });
}

const ruPhrases = {
    '$ unchanged lines': 'Строки без изменений: $',
};

const cmTheme = EditorView.theme({
    '.cm-content': {
        fontFamily: 'monospace',
    },
    '.cm-gutters': {
        backgroundColor: 'var(--themed-secondary-bg)',
        borderRight: '1px solid var(--themed-border-color)',
        color: 'var(--themed-text-muted)',
    },
    '.cm-activeLineGutter': {
        backgroundColor: 'var(--themed-hover-bg)',
    },
    // Colours only the changed words, as the JsDiff view does; `!important` beats the merge base theme's selectors.
    '.cm-changedLine, .cm-inlineChangedLine': {
        backgroundColor: 'transparent !important',
    },
    // The old lines unified shows above the new ones keep a faint tint, or their unchanged words read as the text's own.
    '.cm-deletedChunk': {
        backgroundColor: 'var(--themed-diff-delete-line-bg) !important',
    },
    '.cm-changedText': {
        background: 'var(--themed-diff-insert-bg) !important',
        color: 'var(--themed-diff-insert-text)',
    },
    '&.cm-merge-a .cm-changedText, .cm-deletedText': {
        background: 'var(--themed-diff-delete-bg) !important',
        color: 'var(--themed-diff-delete-text)',
        textDecoration: 'line-through !important',
    },
    '.cm-changedLineGutter, .cm-inlineChangedLineGutter': {
        background: 'var(--themed-diff-insert-text) !important',
    },
    '&.cm-merge-a .cm-changedLineGutter, .cm-deletedLineGutter': {
        background: 'var(--themed-diff-delete-text) !important',
    },
    '.cm-collapsedLines': {
        color: 'var(--themed-text-muted)',
    },
    '.cm-finding': {
        backgroundColor: 'var(--themed-search-highlighted-bg)',
        borderBottom: '2px solid var(--themed-text-warning)',
    },
    '.cm-finding-focused': {
        outline: '2px solid var(--themed-link-color)',
    },
});

/** A read-only CodeMirror view of two texts; the controls around it belong to whoever hosts it. */
@Component({
    selector: 'app-cm-diff-editor',
    templateUrl: './cm-diff-editor.component.html',
    styleUrl: './cm-diff-editor.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.auto-height]': 'autoHeight()',
    },
})
export class CmDiffEditorComponent implements OnDestroy {
    readonly oldText = input.required<string>();
    readonly newText = input.required<string>();
    readonly mode = input<CmDiffMode>('unified');
    readonly collapseUnchanged = input(true);
    /** Computes the changes drawn; CodeMirror's own diff when absent. */
    readonly engine = input<DiffEngine>();
    readonly marks = input<readonly CmMark[]>([]);
    /** A mark to highlight and scroll to. */
    readonly focused = input<CmMark>();
    /**
     * Grow to content height instead of filling a fixed box and scrolling
     * internally — for use inside an outer scroll container (e.g. the diff page,
     * where the review block and the diff share one scrollbar).
     */
    readonly autoHeight = input(false);

    private readonly logger = inject(LoggerService).withContext('CmDiffEditorComponent');
    private readonly platformId = inject(PLATFORM_ID);

    private readonly editorContainer = viewChild<ElementRef<HTMLDivElement>>('editorContainer');

    private singleView?: EditorView;
    private mergeView?: MergeView;

    constructor() {
        effect(() => {
            const container = this.editorContainer();
            const oldText = this.oldText();
            const newText = this.newText();
            const mode = this.mode();
            const collapse = this.collapseUnchanged();
            const diffConfig = cmDiffConfig(this.engine(), () =>
                this.logger.warn("Engine pieces did not match the texts; fell back to CodeMirror's diff"),
            );

            if (container && isPlatformBrowser(this.platformId)) {
                this.destroyEditorView();
                this.createEditorView(oldText, newText, container.nativeElement, mode, collapse, diffConfig);
            }
        });

        // Marks change without rebuilding the editor, so its scroll position survives.
        effect(() => {
            const state: MarkState = { marks: this.marks(), focused: this.focused() };
            this.markedView()?.dispatch({ effects: [setMarksEffect.of(state), ...this.scrollTo(state.focused)] });
        });
    }

    ngOnDestroy(): void {
        this.destroyEditorView();
    }

    goToNext(): void {
        const view = this.markedView();
        if (view) {
            goToNextChunk(view);
        }
    }

    goToPrevious(): void {
        const view = this.markedView();
        if (view) {
            goToPreviousChunk(view);
        }
    }

    /** The editor showing the new text: the single one, or the right column side by side. */
    private markedView(): EditorView | undefined {
        return this.singleView ?? this.mergeView?.b;
    }

    private scrollTo(focused: CmMark | undefined): readonly StateEffect<unknown>[] {
        return focused ? [EditorView.scrollIntoView(focused.from, { y: 'center' })] : [];
    }

    private createEditorView(
        oldText: string,
        newText: string,
        container: HTMLElement,
        mode: CmDiffMode,
        collapse: boolean,
        diffConfig: DiffConfig,
    ): void {
        const initialMarks: MarkState = untracked(() => ({ marks: this.marks(), focused: this.focused() }));
        const collapseUnchanged = collapse ? COLLAPSE_UNCHANGED : undefined;
        const commonExtensions = [
            EditorView.editable.of(false),
            EditorState.readOnly.of(true),
            EditorView.lineWrapping,
            EditorState.phrases.of(ruPhrases),
            cmTheme,
            lineNumbers(),
        ];

        if (mode === 'source') {
            this.singleView = new EditorView({
                doc: newText,
                extensions: [...commonExtensions, marksField(initialMarks)],
                parent: container,
            });
        } else if (mode === 'unified') {
            this.singleView = new EditorView({
                doc: newText,
                extensions: [
                    ...commonExtensions,
                    marksField(initialMarks),
                    unifiedMergeView({
                        diffConfig,
                        original: oldText,
                        highlightChanges: true,
                        allowInlineDiffs: true,
                        mergeControls: false,
                        collapseUnchanged,
                        gutter: true,
                    }),
                ],
                parent: container,
            });
        } else {
            this.mergeView = new MergeView({
                diffConfig,
                a: {
                    doc: oldText,
                    extensions: commonExtensions,
                },
                b: {
                    doc: newText,
                    extensions: [...commonExtensions, marksField(initialMarks)],
                },
                parent: container,
                collapseUnchanged,
                highlightChanges: true,
                gutter: true,
            });
        }

        if (initialMarks.focused) {
            this.markedView()?.dispatch({ effects: this.scrollTo(initialMarks.focused) });
        }
        this.logger.debug('Editor view created', { mode });
    }

    private destroyEditorView(): void {
        if (this.singleView) {
            this.singleView.destroy();
            this.singleView = undefined;
        }
        if (this.mergeView) {
            this.mergeView.destroy();
            this.mergeView = undefined;
        }
    }
}
