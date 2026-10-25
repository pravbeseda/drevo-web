import { AiKeyService } from '../../../services/ai-review/ai-key.service';
import { AiReviewProgress, AiReviewService } from '../../../services/ai-review/ai-review.service';
import { ClipboardService } from '../../../services/clipboard/clipboard.service';
import { buildCheckReport, selectProseLines } from '../../helpers/check-report';
import { CheckReport, CheckReportItem, CheckScope, CheckVerdict, VersionTexts } from '../../models/check-report.model';
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
import { LoggerService, NotificationService } from '@drevo-web/core';
import { CheckCategory, CheckLevel } from '@drevo-web/editor';
import { ButtonComponent } from '@drevo-web/ui/button';
import { IconButtonComponent } from '@drevo-web/ui/icon-button';
import { TextInputComponent } from '@drevo-web/ui/text-input';
import { EMPTY, Subject, map, switchMap } from 'rxjs';

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
    grammar: 'Грамматика',
    style: 'Стиль',
    lexicon: 'Лексика',
};

const PERCENT = 100;

interface AiRun {
    readonly texts: VersionTexts;
    readonly scope: CheckScope;
}

function isAiFinding(item: CheckReportItem): boolean {
    return item.probability !== undefined;
}

// A finding is the same across the rebuilt reports of one run, while the AI answers arrive.
function findingKey(item: CheckReportItem): string {
    return `${item.ruleId}@${item.from}`;
}

function toCommentLine(item: CheckReportItem): string {
    // An AI finding covers its whole paragraph, which the comment does not repeat.
    if (isAiFinding(item)) return `Строка ${item.line} — ${item.message}`;
    const fix = item.suggestion ? ` → «${item.suggestion}»` : '';
    return `Строка ${item.line}: «${item.fragment}»${fix} — ${item.message}`;
}

@Component({
    selector: 'app-moderation-check',
    imports: [ButtonComponent, IconButtonComponent, TextInputComponent],
    templateUrl: './moderation-check.component.html',
    styleUrl: './moderation-check.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModerationCheckComponent {
    private readonly clipboard = inject(ClipboardService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('ModerationCheckComponent');
    private readonly notification = inject(NotificationService);
    private readonly aiKey = inject(AiKeyService);
    private readonly aiReview = inject(AiReviewService);
    private readonly aiRuns = new Subject<AiRun | undefined>();

    readonly texts = input.required<VersionTexts>();
    readonly commentLinesAdded = output<readonly string[]>();
    readonly reportChanged = output<CheckReport>();
    readonly findingSelected = output<CheckReportItem>();

    readonly levelLabels = LEVEL_LABELS;
    readonly categoryLabels = CATEGORY_LABELS;

    private readonly _report = linkedSignal<VersionTexts, CheckReport | undefined>({
        source: this.texts,
        computation: () => undefined,
    });
    readonly report = this._report.asReadonly();

    private readonly _added = linkedSignal<VersionTexts, ReadonlySet<string>>({
        source: this.texts,
        computation: () => new Set(),
    });

    private readonly _aiProgress = linkedSignal<VersionTexts, AiReviewProgress | undefined>({
        source: this.texts,
        computation: () => undefined,
    });

    readonly hasAiKey = computed(() => this.aiKey.key() !== undefined);

    private readonly _keyFormOpen = signal(false);
    readonly keyFormOpen = this._keyFormOpen.asReadonly();

    private readonly _keyDraft = signal('');
    readonly keyDraft = this._keyDraft.asReadonly();

    readonly aiProgressText = computed(() => {
        const progress = this._aiProgress();
        if (!progress) return '';
        const failed = progress.failed > 0 ? `, ${progress.failed} с ошибкой` : '';
        return `ИИ: ${progress.done} из ${progress.total}${failed}`;
    });

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

    constructor() {
        this.aiRuns
            .pipe(
                switchMap(run =>
                    run
                        ? this.aiReview
                              .review(selectProseLines(run.texts.current, run.texts.previous, run.scope))
                              .pipe(map(progress => ({ ...run, progress })))
                        : EMPTY,
                ),
                takeUntilDestroyed(),
            )
            .subscribe(({ texts, scope, progress }) => {
                // The texts changed since the run started: its answers are about another version.
                if (texts !== this.texts()) return;
                this._aiProgress.set(progress);
                this.publish(buildCheckReport(texts.current, texts.previous, scope, progress.findings));
            });
    }

    run(scope: CheckScope): void {
        const texts = this.texts();
        const report = buildCheckReport(texts.current, texts.previous, scope);
        this._added.set(new Set());
        this._aiProgress.set(undefined);
        this.publish(report);
        this.aiRuns.next(this.hasAiKey() ? { texts, scope } : undefined);
        this.logger.info('Check: done', { scope, verdict: report.verdict, findings: report.items.length });
    }

    isAdded(item: CheckReportItem): boolean {
        return this._added().has(findingKey(item));
    }

    isAiFinding(item: CheckReportItem): boolean {
        return isAiFinding(item);
    }

    findingKey(item: CheckReportItem): string {
        return findingKey(item);
    }

    percent(item: CheckReportItem): number {
        return Math.round((item.probability ?? 0) * PERCENT);
    }

    toggleKeyForm(): void {
        this._keyFormOpen.update(open => !open);
        this._keyDraft.set('');
    }

    setKeyDraft(value: string): void {
        this._keyDraft.set(value);
    }

    saveKey(): void {
        this.aiKey.save(this._keyDraft());
        this.toggleKeyForm();
    }

    removeKey(): void {
        this.aiKey.remove();
        this.toggleKeyForm();
    }

    showInText(item: CheckReportItem): void {
        this.findingSelected.emit(item);
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

    private publish(report: CheckReport): void {
        this._report.set(report);
        this.reportChanged.emit(report);
    }

    private addAll(items: readonly CheckReportItem[]): void {
        const added = this._added();
        const fresh = items.filter(item => !added.has(findingKey(item)));
        if (fresh.length === 0) return;

        this._added.set(new Set([...added, ...fresh.map(findingKey)]));
        this.commentLinesAdded.emit(fresh.map(toCommentLine));
        this.logger.info('Check: findings added to the comment', { count: fresh.length });
    }
}
