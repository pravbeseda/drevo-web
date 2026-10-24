import { ArticleService } from '../../../services/articles/article.service';
import { ClipboardService } from '../../../services/clipboard/clipboard.service';
import { buildCheckReport } from '../../helpers/check-report';
import { CheckReport, CheckReportItem, CheckScope, CheckVerdict } from '../../models/check-report.model';
import { HttpErrorResponse } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    inject,
    input,
    linkedSignal,
    output,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService, NotificationService, readApiErrorBody } from '@drevo-web/core';
import { CheckCategory, CheckLevel } from '@drevo-web/editor';
import { ButtonComponent } from '@drevo-web/ui/button';
import { IconButtonComponent } from '@drevo-web/ui/icon-button';
import { Observable, catchError, map, throwError } from 'rxjs';

interface VersionTexts {
    readonly current: string;
    readonly previous: string | undefined;
}

const VERDICT_TITLES: Readonly<Record<CheckVerdict, string>> = {
    clean: 'Замечаний нет',
    fix: 'Требуются исправления',
    serious: 'Серьёзные замечания',
};

const LEVELS: readonly CheckLevel[] = ['serious', 'fix', 'hint'];

const LEVEL_LABELS: Readonly<Record<CheckLevel, string>> = {
    serious: 'Серьёзное',
    fix: 'Исправить',
    hint: 'Совет',
};

const CATEGORY_LABELS: Readonly<Record<CheckCategory, string>> = {
    markup: 'Разметка',
    spelling: 'Орфография',
    style: 'Стиль',
    lexicon: 'Лексика',
};

function toCommentLine(item: CheckReportItem): string {
    const fix = item.suggestion ? ` → «${item.suggestion}»` : '';
    return `Строка ${item.line}: «${item.fragment}»${fix} — ${item.message}`;
}

function isNoPreviousVersion(err: unknown): boolean {
    return err instanceof HttpErrorResponse && readApiErrorBody(err)?.errorCode === 'NO_PREVIOUS_VERSION';
}

@Component({
    selector: 'app-moderation-check',
    imports: [ButtonComponent, IconButtonComponent],
    templateUrl: './moderation-check.component.html',
    styleUrl: './moderation-check.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModerationCheckComponent {
    private readonly articleService = inject(ArticleService);
    private readonly clipboard = inject(ClipboardService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('ModerationCheckComponent');
    private readonly notification = inject(NotificationService);

    readonly versionId = input.required<number>();
    readonly commentLinesAdded = output<readonly string[]>();

    readonly levelLabels = LEVEL_LABELS;
    readonly categoryLabels = CATEGORY_LABELS;

    private readonly _report = linkedSignal<number, CheckReport | undefined>({
        source: this.versionId,
        computation: () => undefined,
    });
    readonly report = this._report.asReadonly();

    private readonly _added = linkedSignal<CheckReport | undefined, ReadonlySet<CheckReportItem>>({
        source: this._report,
        computation: () => new Set(),
    });
    readonly added = this._added.asReadonly();

    private readonly _isLoading = signal(false);
    readonly isLoading = this._isLoading.asReadonly();

    readonly verdictTitle = computed(() => {
        const report = this._report();
        return report ? VERDICT_TITLES[report.verdict] : 'Не проверено';
    });

    readonly summary = computed(() => {
        const counts = this._report()?.counts;
        if (!counts) return '';
        return LEVELS.filter(level => counts[level] > 0)
            .map(level => `${LEVEL_LABELS[level]}: ${counts[level]}`)
            .join(' · ');
    });

    run(scope: CheckScope): void {
        const versionId = this.versionId();
        this._isLoading.set(true);
        this.logger.info('Check: started', { versionId, scope });

        this.loadTexts(versionId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: texts => {
                    const report = buildCheckReport(texts.current, texts.previous, scope);
                    this._report.set(report);
                    this._isLoading.set(false);
                    this.logger.info('Check: done', { versionId, scope, verdict: report.verdict });
                },
                error: (err: unknown) => {
                    this._isLoading.set(false);
                    this.notification.error('Не удалось загрузить текст версии');
                    this.logger.error('Check: failed to load the version', err);
                },
            });
    }

    addToComment(item: CheckReportItem): void {
        this.addAll([item]);
    }

    addAllToComment(): void {
        this.addAll(this._report()?.items ?? []);
    }

    copy(item: CheckReportItem): void {
        this.clipboard
            .copy(toCommentLine(item))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => this.notification.success('Замечание скопировано'),
                error: (err: unknown) => {
                    this.notification.error('Не удалось скопировать замечание');
                    this.logger.error('Check: copy failed', err);
                },
            });
    }

    private addAll(items: readonly CheckReportItem[]): void {
        const added = this._added();
        const fresh = items.filter(item => !added.has(item));
        if (fresh.length === 0) return;

        this._added.set(new Set([...added, ...fresh]));
        this.commentLinesAdded.emit(fresh.map(toCommentLine));
        this.logger.info('Check: findings added to the comment', { count: fresh.length });
    }

    private loadTexts(versionId: number): Observable<VersionTexts> {
        return this.articleService.getVersionPairs(versionId).pipe(
            map(pairs => ({ current: pairs.current.content, previous: pairs.previous.content })),
            catchError((err: unknown) =>
                isNoPreviousVersion(err)
                    ? this.articleService
                          .getArticleVersion(versionId)
                          .pipe(map(version => ({ current: version.content, previous: undefined })))
                    : throwError(() => err),
            ),
        );
    }
}
