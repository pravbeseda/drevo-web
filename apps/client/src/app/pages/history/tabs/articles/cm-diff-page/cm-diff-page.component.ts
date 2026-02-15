import { ArticleService } from '../../../../../services/articles/article.service';
import { isPlatformBrowser } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    OnDestroy,
    OnInit,
    PLATFORM_ID,
    signal,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { MergeView, goToNextChunk, goToPreviousChunk, unifiedMergeView } from '@codemirror/merge';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { LoggerService } from '@drevo-web/core';
import { VersionPairs } from '@drevo-web/shared';
import { IconButtonComponent, SpinnerComponent } from '@drevo-web/ui';

type ViewMode = 'unified' | 'side-by-side';

const ruPhrases = {
    '$ unchanged lines': 'Строки без изменений: $',
};

@Component({
    selector: 'app-cm-diff-page',
    imports: [SpinnerComponent, IconButtonComponent],
    templateUrl: './cm-diff-page.component.html',
    styleUrl: './cm-diff-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmDiffPageComponent implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly articleService = inject(ArticleService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('CmDiffPageComponent');
    private readonly platformId = inject(PLATFORM_ID);

    private readonly editorContainer = viewChild<ElementRef<HTMLDivElement>>('editorContainer');

    private unifiedView?: EditorView;
    private mergeView?: MergeView;

    private readonly _isLoading = signal(true);
    private readonly _error = signal<string | undefined>(undefined);
    private readonly _versionPairs = signal<VersionPairs | undefined>(undefined);
    private readonly _viewMode = signal<ViewMode>('unified');

    readonly isLoading = this._isLoading.asReadonly();
    readonly error = this._error.asReadonly();
    readonly versionPairs = this._versionPairs.asReadonly();
    readonly viewMode = this._viewMode.asReadonly();

    readonly versionInfo = computed(() => {
        const pairs = this._versionPairs();
        if (!pairs) return undefined;

        return {
            title: pairs.current.title,
            previous: pairs.previous,
            current: pairs.current,
        };
    });

    constructor() {
        effect(() => {
            const container = this.editorContainer();
            const pairs = this._versionPairs();
            const mode = this._viewMode();

            if (container && pairs && isPlatformBrowser(this.platformId)) {
                this.destroyEditorView();
                this.createEditorView(pairs, container.nativeElement, mode);
            }
        });
    }

    ngOnInit(): void {
        const paramMap = this.route.snapshot.paramMap;
        const id1Param = paramMap.get('id1') ?? paramMap.get('id');
        const id2Param = paramMap.get('id2');

        const version1 = id1Param ? parseInt(id1Param, 10) : NaN;

        if (isNaN(version1) || version1 <= 0) {
            this._error.set('Неверный ID версии');
            this._isLoading.set(false);
            this.logger.error('Invalid version ID in route', id1Param);
            return;
        }

        if (id2Param) {
            const version2 = parseInt(id2Param, 10);
            if (isNaN(version2) || version2 <= 0) {
                this._error.set('Неверный ID версии');
                this._isLoading.set(false);
                this.logger.error('Invalid version2 ID in route', id2Param);
                return;
            }
            const [older, newer] = [version1, version2].sort((a, b) => a - b);
            this.loadVersionPairs(newer, older);
        } else {
            this.loadVersionPairs(version1);
        }
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

    formatDate(date: Date): string {
        return date.toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    private getActiveEditorView(): EditorView | undefined {
        if (this._viewMode() === 'unified') {
            return this.unifiedView;
        }
        // For side-by-side, use editor B (current version)
        return this.mergeView?.b;
    }

    private loadVersionPairs(versionId: number, version2?: number): void {
        this.articleService
            .getVersionPairs(versionId, version2)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: pairs => {
                    this._versionPairs.set(pairs);
                    this._isLoading.set(false);
                    this.logger.info('Version pairs loaded', {
                        currentId: pairs.current.versionId,
                        previousId: pairs.previous.versionId,
                    });
                },
                error: error => {
                    const errorCode = error?.error?.errorCode;
                    if (errorCode === 'NO_PREVIOUS_VERSION') {
                        this._error.set('Предыдущая версия не найдена');
                    } else {
                        this._error.set('Ошибка загрузки данных');
                    }
                    this._isLoading.set(false);
                    this.logger.error('Failed to load version pairs', error);
                },
            });
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
