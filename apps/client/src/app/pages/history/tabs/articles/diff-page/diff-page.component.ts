import { ArticleService } from '../../../../../services/articles/article.service';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    HostListener,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import {
    DEFAULT_JS_DIFF_OPTIONS,
    DIFF_ENGINES,
    DiffChange,
    DiffEngineEntry,
    escapeHtml,
    JsDiffGranularity,
    JsDiffOptions,
    VersionPairs,
} from '@drevo-web/shared';
import {
    DropdownMenuComponent,
    DropdownMenuItemComponent,
    DropdownMenuTriggerDirective,
    IconButtonComponent,
    SpinnerComponent,
} from '@drevo-web/ui';

@Component({
    selector: 'app-diff-page',
    imports: [
        SpinnerComponent,
        IconButtonComponent,
        DropdownMenuComponent,
        DropdownMenuItemComponent,
        DropdownMenuTriggerDirective,
    ],
    templateUrl: './diff-page.component.html',
    styleUrl: './diff-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiffPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly articleService = inject(ArticleService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('DiffPageComponent');

    private readonly _isLoading = signal(true);
    private readonly _error = signal<string | undefined>(undefined);
    private readonly _versionPairs = signal<VersionPairs | undefined>(undefined);
    private readonly _selectedEngine = signal<DiffEngineEntry>(DIFF_ENGINES[0]);
    private readonly _jsDiffOptions = signal<JsDiffOptions>(DEFAULT_JS_DIFF_OPTIONS);
    private readonly _settingsOpen = signal(false);

    readonly isLoading = this._isLoading.asReadonly();
    readonly error = this._error.asReadonly();
    readonly versionPairs = this._versionPairs.asReadonly();
    readonly selectedEngine = this._selectedEngine.asReadonly();
    readonly engines = DIFF_ENGINES;
    readonly settingsOpen = this._settingsOpen.asReadonly();
    readonly jsDiffOptions = this._jsDiffOptions.asReadonly();

    readonly isJsDiff = computed(() => this._selectedEngine().id === 'js-diff');

    readonly isIgnoreCaseAvailable = computed(() => {
        const g = this._jsDiffOptions().granularity;
        return g === 'chars' || g === 'words' || g === 'wordsWithSpace';
    });

    readonly isIntlSegmenterAvailable = computed(() => {
        const g = this._jsDiffOptions().granularity;
        return g === 'words' || g === 'wordsWithSpace';
    });

    readonly isLineOptionsAvailable = computed(() => this._jsDiffOptions().granularity === 'lines');

    readonly diffHtml = computed(() => {
        const pairs = this._versionPairs();
        const engine = this._selectedEngine();
        if (!pairs) return '';

        const options = this.isJsDiff() ? this._jsDiffOptions() : undefined;
        const changes = engine.engine.computeDiff(pairs.previous.content, pairs.current.content, options);
        return this.renderDiffHtml(changes);
    });

    readonly versionInfo = computed(() => {
        const pairs = this._versionPairs();
        if (!pairs) return undefined;

        return {
            title: pairs.current.title,
            previous: pairs.previous,
            current: pairs.current,
        };
    });

    readonly granularityOptions: readonly {
        readonly value: JsDiffGranularity;
        readonly label: string;
    }[] = [
        { value: 'chars', label: 'Символы' },
        { value: 'words', label: 'Слова' },
        { value: 'wordsWithSpace', label: 'Слова с пробелами' },
        { value: 'lines', label: 'Строки' },
        { value: 'sentences', label: 'Предложения' },
    ];

    ngOnInit(): void {
        const idParam = this.route.snapshot.paramMap.get('id');
        const versionId = idParam ? parseInt(idParam, 10) : NaN;

        if (isNaN(versionId) || versionId <= 0) {
            this._error.set('Неверный ID версии');
            this._isLoading.set(false);
            this.logger.error('Invalid version ID in route', idParam);
            return;
        }

        this.loadVersionPairs(versionId);
    }

    onEngineChange(engine: DiffEngineEntry): void {
        this._selectedEngine.set(engine);
        this.logger.info('Diff engine changed', { engineId: engine.id });
    }

    toggleSettings(): void {
        this._settingsOpen.update(open => !open);
    }

    closeSettings(): void {
        this._settingsOpen.set(false);
    }

    onGranularityChange(granularity: JsDiffGranularity): void {
        this._jsDiffOptions.update(opts => ({ ...opts, granularity }));
        this.logger.info('JsDiff granularity changed', { granularity });
    }

    onOptionChange(key: Exclude<keyof JsDiffOptions, 'granularity'>, value: boolean): void {
        this._jsDiffOptions.update(opts => ({ ...opts, [key]: value }));
        this.logger.info('JsDiff option changed', { [key]: value });
    }

    onCheckboxChange(key: Exclude<keyof JsDiffOptions, 'granularity'>, event: Event): void {
        const checked = (event.target as HTMLInputElement).checked;
        this.onOptionChange(key, checked);
    }

    @HostListener('document:keydown.escape')
    onEscapePress(): void {
        if (this._settingsOpen()) {
            this.closeSettings();
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

    private loadVersionPairs(versionId: number): void {
        this.articleService
            .getVersionPairs(versionId)
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

    private renderDiffHtml(changes: DiffChange[]): string {
        return changes
            .map(change => {
                const escaped = escapeHtml(change.text);
                switch (change.type) {
                    case 'insert':
                        return `<span class="diff-insert">${escaped}</span>`;
                    case 'delete':
                        return `<span class="diff-delete">${escaped}</span>`;
                    default:
                        return escaped;
                }
            })
            .join('');
    }
}
