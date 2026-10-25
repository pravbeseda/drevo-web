import { ArticleService } from '../../../services/articles/article.service';
import { CheckReport, CheckReportItem, VersionTexts } from '../../models/check-report.model';
import { VersionForModeration } from '../../models/version-for-moderation.model';
import { ArticleModerationPanelComponent } from '../article-moderation-panel/article-moderation-panel.component';
import { CmDiffEditorComponent, CmDiffMode } from '../cm-diff-editor/cm-diff-editor.component';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LoggerService, WINDOW, readApiErrorBody } from '@drevo-web/core';
import { ModerationResult } from '@drevo-web/shared';
import { ButtonToggleGroupComponent, ButtonToggleOption } from '@drevo-web/ui/button-toggle-group';
import { BREAKPOINT_DESKTOP } from '@drevo-web/ui/constants';
import { FormatDatePipe } from '@drevo-web/ui/format-date';
import { IconButtonComponent } from '@drevo-web/ui/icon-button';
import { MODAL_DATA, ModalData } from '@drevo-web/ui/modal';
import { Observable, catchError, map, throwError } from 'rxjs';

export interface ModerationSheetData {
    readonly version: VersionForModeration;
}

type SheetTab = 'decision' | 'text';

const MODE_OPTIONS: Readonly<Record<CmDiffMode, ButtonToggleOption>> = {
    unified: { value: 'unified', label: '1 колонка' },
    'side-by-side': { value: 'side-by-side', label: '2 колонки' },
    source: { value: 'source', label: 'Исходник' },
};

function isCmDiffMode(value: string | number): value is CmDiffMode {
    return value in MODE_OPTIONS;
}

function isNoPreviousVersion(err: unknown): boolean {
    return err instanceof HttpErrorResponse && readApiErrorBody(err)?.errorCode === 'NO_PREVIOUS_VERSION';
}

/** Moderation of one version: its text in CodeMirror beside the decision, or as two tabs on a narrow screen. */
@Component({
    selector: 'app-moderation-sheet',
    imports: [
        ArticleModerationPanelComponent,
        ButtonToggleGroupComponent,
        CmDiffEditorComponent,
        FormatDatePipe,
        FormsModule,
        IconButtonComponent,
    ],
    templateUrl: './moderation-sheet.component.html',
    styleUrl: './moderation-sheet.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModerationSheetComponent {
    private readonly modal = inject<ModalData<ModerationSheetData, ModerationResult>>(MODAL_DATA);
    private readonly articleService = inject(ArticleService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly window = inject(WINDOW);
    private readonly logger = inject(LoggerService).withContext('ModerationSheetComponent');

    readonly version = this.modal.data.version;

    private readonly _texts = signal<VersionTexts | undefined>(undefined);
    readonly texts = this._texts.asReadonly();

    private readonly _loadFailed = signal(false);
    readonly loadFailed = this._loadFailed.asReadonly();

    private readonly _mode = signal<CmDiffMode>('unified');
    readonly mode = this._mode.asReadonly();

    private readonly _report = signal<CheckReport | undefined>(undefined);
    readonly marks = computed(() => this._report()?.items ?? []);

    private readonly _focused = signal<CheckReportItem | undefined>(undefined);
    readonly focused = this._focused.asReadonly();

    // Unchanged lines stay collapsed until a finding among them is shown.
    private readonly _showUnchanged = signal(false);
    readonly collapseUnchanged = computed(() => !this._showUnchanged());

    private readonly _tab = signal<SheetTab>('decision');
    readonly tab = this._tab.asReadonly();

    private readonly _isNarrow = signal(false);
    readonly isNarrow = this._isNarrow.asReadonly();

    readonly modeOptions = computed((): readonly ButtonToggleOption[] => {
        if (this._texts()?.previous === undefined) return [MODE_OPTIONS.source];
        return this._isNarrow()
            ? [MODE_OPTIONS.unified, MODE_OPTIONS.source]
            : [MODE_OPTIONS.unified, MODE_OPTIONS['side-by-side'], MODE_OPTIONS.source];
    });

    constructor() {
        this.watchWidth();
        this.loadTexts(this.version.versionId);
    }

    setMode(value: string | number): void {
        if (!isCmDiffMode(value)) return;
        this._mode.set(value);
        this.logger.info('Sheet: mode changed', { mode: value });
    }

    selectTab(tab: SheetTab): void {
        this._tab.set(tab);
    }

    onReport(report: CheckReport): void {
        this._report.set(report);
        // shortcut: an AI answer arriving after «Показать в тексте» drops the focus too; keep it once the editor scrolls only on a new focus.
        this._focused.set(undefined);
    }

    showFinding(item: CheckReportItem): void {
        this._focused.set(item);
        if (!item.isChanged) this._showUnchanged.set(true);
        this._tab.set('text');
        this.logger.info('Sheet: finding shown', { ruleId: item.ruleId, line: item.line });
    }

    onModerated(result: ModerationResult): void {
        this.modal.close(result);
    }

    close(): void {
        this.modal.close();
    }

    private watchWidth(): void {
        // The sheet opens on a click, so there is always a window; the guard is for the token's type.
        const query = this.window?.matchMedia(`(max-width: ${BREAKPOINT_DESKTOP - 1}px)`);
        if (!query) return;
        const apply = (narrow: boolean): void => {
            this._isNarrow.set(narrow);
            if (narrow && this._mode() === 'side-by-side') this._mode.set('unified');
        };
        const onChange = (event: MediaQueryListEvent): void => apply(event.matches);

        apply(query.matches);
        query.addEventListener('change', onChange);
        this.destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
    }

    private loadTexts(versionId: number): void {
        this.fetchTexts(versionId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: texts => {
                    this._texts.set(texts);
                    if (texts.previous === undefined) this._mode.set('source');
                    this.logger.info('Sheet: texts loaded', { versionId, firstVersion: texts.previous === undefined });
                },
                error: (err: unknown) => {
                    this._loadFailed.set(true);
                    this.logger.error('Sheet: failed to load the texts', err);
                },
            });
    }

    private fetchTexts(versionId: number): Observable<VersionTexts> {
        return this.articleService.getVersionPairs(versionId).pipe(
            map(pairs => ({ current: pairs.current.content, previous: pairs.previous.content })),
            catchError((err: unknown) =>
                isNoPreviousVersion(err)
                    ? this.articleService
                          .getArticleVersion(versionId)
                          // Unlike versionpairs, the version endpoint returns the content raw, and CodeMirror
                          // reads CRLF as one character: the finding offsets would drift a line at a time.
                          .pipe(
                              map(version => ({
                                  current: version.content.replace(/\r\n/gu, '\n'),
                                  previous: undefined,
                              })),
                          )
                    : throwError(() => err),
            ),
        );
    }
}
