import { ArticleService } from '../../../../services/articles/article.service';
import { DestroyRef, inject, Injectable, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Logger, LoggerService } from '@drevo-web/core';
import { VersionPairs } from '@drevo-web/shared';

@Injectable()
export class DiffPageDataService {
    private readonly route = inject(ActivatedRoute);
    private readonly articleService = inject(ArticleService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger: Logger = inject(LoggerService).withContext('DiffPageDataService');

    private readonly _isLoading = signal(true);
    private readonly _error = signal<string | undefined>(undefined);
    private readonly _versionPairs = signal<VersionPairs | undefined>(undefined);

    readonly isLoading = this._isLoading.asReadonly();
    readonly error = this._error.asReadonly();
    readonly versionPairs = this._versionPairs.asReadonly();

    readonly versionInfo = computed(() => {
        const pairs = this._versionPairs();
        if (!pairs) return undefined;

        return {
            title: pairs.current.title,
            previous: pairs.previous,
            current: pairs.current,
        };
    });

    loadFromRoute(): void {
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

    formatDate(date: Date): string {
        return date.toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
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
}
