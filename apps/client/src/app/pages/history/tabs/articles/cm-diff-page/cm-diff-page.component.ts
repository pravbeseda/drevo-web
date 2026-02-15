import { DiffPageDataService } from '../diff-page-data.service';
import { isPlatformBrowser } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    effect,
    ElementRef,
    inject,
    OnDestroy,
    OnInit,
    PLATFORM_ID,
    signal,
    viewChild,
} from '@angular/core';
import { DiffConfig, MergeView, goToNextChunk, goToPreviousChunk, unifiedMergeView } from '@codemirror/merge';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { LoggerService } from '@drevo-web/core';
import { VersionPairs } from '@drevo-web/shared';
import { FormatDatePipe, IconButtonComponent, SpinnerComponent } from '@drevo-web/ui';

type ViewMode = 'unified' | 'side-by-side';

const ruPhrases = {
    '$ unchanged lines': 'Строки без изменений: $',
};

const diffConfig: DiffConfig = {
    scanLimit: 10_000_000,
    timeout: 15000,
};

@Component({
    selector: 'app-cm-diff-page',
    imports: [SpinnerComponent, IconButtonComponent, FormatDatePipe],
    providers: [DiffPageDataService],
    templateUrl: './cm-diff-page.component.html',
    styleUrl: './cm-diff-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmDiffPageComponent implements OnInit, OnDestroy {
    readonly data = inject(DiffPageDataService);

    private readonly logger = inject(LoggerService).withContext('CmDiffPageComponent');
    private readonly platformId = inject(PLATFORM_ID);

    private readonly editorContainer = viewChild<ElementRef<HTMLDivElement>>('editorContainer');

    private unifiedView?: EditorView;
    private mergeView?: MergeView;

    private readonly _viewMode = signal<ViewMode>('unified');
    readonly viewMode = this._viewMode.asReadonly();

    constructor() {
        effect(() => {
            const container = this.editorContainer();
            const pairs = this.data.versionPairs();
            const mode = this._viewMode();

            if (container && pairs && isPlatformBrowser(this.platformId)) {
                this.destroyEditorView();
                this.createEditorView(pairs, container.nativeElement, mode);
            }
        });
    }

    ngOnInit(): void {
        this.data.loadFromRoute();
    }

    ngOnDestroy(): void {
        this.destroyEditorView();
    }

    toggleViewMode(): void {
        const newMode: ViewMode = this._viewMode() === 'unified' ? 'side-by-side' : 'unified';
        this._viewMode.set(newMode);
        this.logger.info('View mode changed', { mode: newMode });
    }

    goToNext(): void {
        const view = this.getActiveEditorView();
        if (view) {
            goToNextChunk(view);
        }
    }

    goToPrevious(): void {
        const view = this.getActiveEditorView();
        if (view) {
            goToPreviousChunk(view);
        }
    }

    private getActiveEditorView(): EditorView | undefined {
        if (this._viewMode() === 'unified') {
            return this.unifiedView;
        }
        // For side-by-side, use editor B (current version)
        return this.mergeView?.b;
    }

    private createEditorView(pairs: VersionPairs, container: HTMLElement, mode: ViewMode): void {
        const commonExtensions = [
            EditorView.editable.of(false),
            EditorState.readOnly.of(true),
            EditorView.lineWrapping,
            EditorState.phrases.of(ruPhrases),
            this.createThemeExtension(),
            lineNumbers(),
        ];

        if (mode === 'unified') {
            this.unifiedView = new EditorView({
                doc: pairs.current.content,
                extensions: [
                    ...commonExtensions,
                    unifiedMergeView({
                        diffConfig,
                        original: pairs.previous.content,
                        highlightChanges: true,
                        allowInlineDiffs: true,
                        mergeControls: false,
                        collapseUnchanged: { margin: 3, minSize: 4 },
                        gutter: true,
                    }),
                ],
                parent: container,
            });
        } else {
            this.mergeView = new MergeView({
                diffConfig,
                a: {
                    doc: pairs.previous.content,
                    extensions: commonExtensions,
                },
                b: {
                    doc: pairs.current.content,
                    extensions: commonExtensions,
                },
                parent: container,
                collapseUnchanged: { margin: 3, minSize: 4 },
                highlightChanges: true,
                gutter: true,
            });
        }

        this.logger.debug('Editor view created', { mode: this._viewMode() });
    }

    private destroyEditorView(): void {
        if (this.unifiedView) {
            this.unifiedView.destroy();
            this.unifiedView = undefined;
        }
        if (this.mergeView) {
            this.mergeView.destroy();
            this.mergeView = undefined;
        }
    }

    private createThemeExtension() {
        return EditorView.theme({
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
            '.cm-changedLine': {
                backgroundColor: 'var(--themed-diff-insert-bg) !important',
            },
            '.cm-deletedChunk': {
                backgroundColor: 'var(--themed-diff-delete-bg)',
            },
            '.cm-insertedLine': {
                backgroundColor: 'var(--themed-diff-insert-bg) !important',
            },
            '.cm-deletedLine': {
                backgroundColor: 'var(--themed-diff-delete-bg) !important',
            },
            '.cm-changedText': {
                background: 'none',
                fontWeight: 'bold',
            },
            '.cm-collapsedLines': {
                color: 'var(--themed-text-muted)',
            },
        });
    }
}
