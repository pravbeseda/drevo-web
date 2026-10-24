import { ClipboardService } from '../../../services/clipboard/clipboard.service';
import { buildCheckReport } from '../../helpers/check-report';
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
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService, NotificationService } from '@drevo-web/core';
import { CheckCategory, CheckLevel } from '@drevo-web/editor';
import { ButtonComponent } from '@drevo-web/ui/button';
import { IconButtonComponent } from '@drevo-web/ui/icon-button';

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

@Component({
    selector: 'app-moderation-check',
    imports: [ButtonComponent, IconButtonComponent],
    templateUrl: './moderation-check.component.html',
    styleUrl: './moderation-check.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModerationCheckComponent {
    private readonly clipboard = inject(ClipboardService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('ModerationCheckComponent');
    private readonly notification = inject(NotificationService);

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

    private readonly _added = linkedSignal<CheckReport | undefined, ReadonlySet<CheckReportItem>>({
        source: this._report,
        computation: () => new Set(),
    });
    readonly added = this._added.asReadonly();

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
        const { current, previous } = this.texts();
        const report = buildCheckReport(current, previous, scope);
        this._report.set(report);
        this.reportChanged.emit(report);
        this.logger.info('Check: done', { scope, verdict: report.verdict, findings: report.items.length });
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

    private addAll(items: readonly CheckReportItem[]): void {
        const added = this._added();
        const fresh = items.filter(item => !added.has(item));
        if (fresh.length === 0) return;

        this._added.set(new Set([...added, ...fresh]));
        this.commentLinesAdded.emit(fresh.map(toCommentLine));
        this.logger.info('Check: findings added to the comment', { count: fresh.length });
    }
}
