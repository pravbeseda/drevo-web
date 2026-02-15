import { DiffPageDataService } from '../diff-page-data.service';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    HostListener,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { LoggerService } from '@drevo-web/core';
import {
    DEFAULT_JS_DIFF_OPTIONS,
    DIFF_ENGINES,
    DiffChange,
    DiffEngineEntry,
    escapeHtml,
    JsDiffGranularity,
    JsDiffOptions,
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
    providers: [DiffPageDataService],
    templateUrl: './diff-page.component.html',
    styleUrl: './diff-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiffPageComponent implements OnInit {
    readonly data = inject(DiffPageDataService);

    private readonly logger = inject(LoggerService).withContext('DiffPageComponent');

    private readonly _selectedEngine = signal<DiffEngineEntry>(DIFF_ENGINES[0]);
    private readonly _jsDiffOptions = signal<JsDiffOptions>(DEFAULT_JS_DIFF_OPTIONS);
    private readonly _settingsOpen = signal(false);

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
        const pairs = this.data.versionPairs();
        const engine = this._selectedEngine();
        if (!pairs) return '';

        const options = this.isJsDiff() ? this._jsDiffOptions() : undefined;
        const changes = engine.engine.computeDiff(pairs.previous.content, pairs.current.content, options);
        return this.renderDiffHtml(changes);
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
        this.data.loadFromRoute();
    }

    onEngineChange(engine: DiffEngineEntry): void {
        this._selectedEngine.set(engine);
        this._settingsOpen.set(false);
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
