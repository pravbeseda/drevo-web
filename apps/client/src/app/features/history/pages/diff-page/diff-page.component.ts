import { DiffPageDataService } from '../../services/diff-page-data.service';
import { ChangeDetectionStrategy, Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
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
    FormatDatePipe,
    IconButtonComponent,
    SidebarActionComponent,
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
        FormatDatePipe,
        SidebarActionComponent,
    ],
    providers: [DiffPageDataService],
    templateUrl: './diff-page.component.html',
    styleUrl: './diff-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiffPageComponent implements OnInit {
    readonly data = inject(DiffPageDataService);

    private readonly logger = inject(LoggerService).withContext('DiffPageComponent');
    private readonly router = inject(Router);

    get diffAlternateUrl(): string {
        return this.router.url.replace('/diff2/', '/diff/');
    }

    private readonly _selectedEngine = signal<DiffEngineEntry>(DIFF_ENGINES[0]);
    private readonly _jsDiffOptions = signal<JsDiffOptions>(DEFAULT_JS_DIFF_OPTIONS);
    private readonly _settingsOpen = signal(false);
    private readonly _collapsed = signal(false);

    readonly selectedEngine = this._selectedEngine.asReadonly();
    readonly engines = DIFF_ENGINES;
    readonly settingsOpen = this._settingsOpen.asReadonly();
    readonly jsDiffOptions = this._jsDiffOptions.asReadonly();
    readonly collapsed = this._collapsed.asReadonly();

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
        return this._collapsed() ? this.renderCollapsedDiffHtml(changes) : this.renderDiffHtml(changes);
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

    toggleCollapsed(): void {
        this._collapsed.update(v => !v);
        this.logger.info('Collapsed mode changed', { collapsed: this._collapsed() });
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

    private renderCollapsedDiffHtml(changes: DiffChange[]): string {
        const lines = this.splitChangesIntoLines(changes);
        const isChanged = lines.map(line => line.some(c => c.type !== 'equal'));

        // Show changed lines, single unchanged lines, collapse groups of 2+
        const show: boolean[] = new Array(lines.length).fill(false);
        let i = 0;
        while (i < lines.length) {
            if (isChanged[i]) {
                show[i] = true;
                i++;
            } else {
                let j = i;
                while (j < lines.length && !isChanged[j]) j++;
                if (j - i === 1) show[i] = true;
                i = j;
            }
        }

        // Render
        let result = '';
        let needsNewline = false;
        i = 0;
        while (i < lines.length) {
            if (show[i]) {
                if (needsNewline) result += '\n';
                result += this.renderDiffHtml(lines[i]);
                needsNewline = true;
                i++;
            } else {
                let j = i;
                while (j < lines.length && !show[j]) j++;
                result += `<div class="diff-collapsed-lines">Строк без изменений: ${j - i}</div>`;
                needsNewline = false;
                i = j;
            }
        }

        return result;
    }

    private splitChangesIntoLines(changes: DiffChange[]): DiffChange[][] {
        const lines: DiffChange[][] = [[]];
        for (const change of changes) {
            const parts = change.text.split('\n');
            for (let i = 0; i < parts.length; i++) {
                if (i > 0) lines.push([]);
                const text = parts[i].replace(/\r/g, '');
                if (text) {
                    lines[lines.length - 1].push({ type: change.type, text });
                }
            }
        }
        // Remove trailing empty line — artifact of text ending with \n
        while (lines.length > 0 && lines[lines.length - 1].length === 0) {
            lines.pop();
        }

        // Whitespace-only lines (\r, spaces, tabs): normalize to 'equal'
        // so they don't appear as highlighted blank lines in collapsed mode
        return lines.map(line => {
            if (line.some(c => c.text.trim())) return line;
            return line.map(c => ({ type: 'equal' as const, text: c.text }));
        });
    }
}
