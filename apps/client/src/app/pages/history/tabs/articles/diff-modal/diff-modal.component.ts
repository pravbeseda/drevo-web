import { ArticleService } from '../../../../../services/articles/article.service';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '@drevo-web/core';
import {
    DIFF_ENGINES,
    DiffChange,
    DiffEngineEntry,
    escapeHtml,
    VersionPairs,
} from '@drevo-web/shared';
import {
    ButtonComponent,
    DropdownMenuComponent,
    DropdownMenuItemComponent,
    DropdownMenuTriggerDirective,
    IconButtonComponent,
    MODAL_DATA,
    ModalData,
    SpinnerComponent,
} from '@drevo-web/ui';

export interface DiffModalData {
    readonly versionId: number;
}

@Component({
    selector: 'app-diff-modal',
    imports: [
        SpinnerComponent,
        IconButtonComponent,
        ButtonComponent,
        DropdownMenuComponent,
        DropdownMenuItemComponent,
        DropdownMenuTriggerDirective,
    ],
    templateUrl: './diff-modal.component.html',
    styleUrl: './diff-modal.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiffModalComponent implements OnInit {
    private readonly modalData = inject<ModalData<DiffModalData>>(MODAL_DATA);
    private readonly articleService = inject(ArticleService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger =
        inject(LoggerService).withContext('DiffModalComponent');

    private readonly _isLoading = signal(true);
    private readonly _error = signal<string | undefined>(undefined);
    private readonly _versionPairs = signal<VersionPairs | undefined>(
        undefined
    );
    private readonly _selectedEngine = signal<DiffEngineEntry>(DIFF_ENGINES[0]);

    readonly isLoading = this._isLoading.asReadonly();
    readonly error = this._error.asReadonly();
    readonly versionPairs = this._versionPairs.asReadonly();
    readonly selectedEngine = this._selectedEngine.asReadonly();
    readonly engines = DIFF_ENGINES;

    readonly diffHtml = computed(() => {
        const pairs = this._versionPairs();
        const engine = this._selectedEngine();
        if (!pairs) return '';

        const changes = engine.engine.computeDiff(
            pairs.previous.content,
            pairs.current.content
        );
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

    ngOnInit(): void {
        this.loadVersionPairs();
    }

    onEngineChange(engine: DiffEngineEntry): void {
        this._selectedEngine.set(engine);
        this.logger.info('Diff engine changed', { engineId: engine.id });
    }

    onClose(): void {
        this.modalData.close();
    }

    formatDate(date: Date): string {
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    private loadVersionPairs(): void {
        const versionId = this.modalData.data.versionId;

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
