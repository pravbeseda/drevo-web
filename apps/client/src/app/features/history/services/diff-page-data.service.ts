import { ArticleService } from '../../../services/articles/article.service';
import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Logger, LoggerService } from '@drevo-web/core';
import { ApprovalStatus, VersionPairs } from '@drevo-web/shared';
import { Observable, catchError, of, shareReplay, tap } from 'rxjs';

@Injectable()
export class DiffPageDataService {
    private readonly articleService = inject(ArticleService);
    private readonly logger: Logger = inject(LoggerService).withContext('DiffPageDataService');

    private readonly _isLoading = signal(true);
    private readonly _error = signal<string | undefined>(undefined);
    private readonly _versionPairs = signal<VersionPairs | undefined>(undefined);

    readonly isLoading = this._isLoading.asReadonly();
    readonly error = this._error.asReadonly();
    readonly versionPairs = this._versionPairs.asReadonly();

    private _load$: Observable<VersionPairs | undefined> | undefined;
    private _loadedParams: string | undefined;

    updateCurrentApproval(approved: ApprovalStatus, comment = ''): void {
        const pairs = this._versionPairs();
        if (!pairs) return;
        this._versionPairs.set({
            ...pairs,
            current: { ...pairs.current, approved, comment },
        });
    }

    load(snapshot: ActivatedRouteSnapshot): Observable<VersionPairs | undefined> {
        const paramMap = snapshot.paramMap;
        const paramsKey = `${paramMap.get('id1') ?? paramMap.get('id')}_${paramMap.get('id2') ?? ''}`;

        if (this._load$ && this._loadedParams === paramsKey) return this._load$;

        this._loadedParams = paramsKey;
        this._isLoading.set(true);
        this._error.set(undefined);
        this._versionPairs.set(undefined);
        this._load$ = undefined;

        const id1Param = paramMap.get('id1') ?? paramMap.get('id');
        const id2Param = paramMap.get('id2');

        const version1 = id1Param ? parseInt(id1Param, 10) : NaN;

        if (isNaN(version1) || version1 <= 0) {
            this._error.set('Неверный ID версии');
            this._isLoading.set(false);
            this.logger.error('Invalid version ID in route', id1Param);
            this._load$ = of(undefined);
            return this._load$;
        }

        let newer: number;
        let older: number | undefined;

        if (id2Param) {
            const version2 = parseInt(id2Param, 10);
            if (isNaN(version2) || version2 <= 0) {
                this._error.set('Неверный ID версии');
                this._isLoading.set(false);
                this.logger.error('Invalid version2 ID in route', id2Param);
                this._load$ = of(undefined);
                return this._load$;
            }
            const sorted = [version1, version2].sort((a, b) => a - b);
            older = sorted[0];
            newer = sorted[1];
        } else {
            newer = version1;
            older = undefined;
        }

        this._load$ = this.articleService.getVersionPairs(newer, older).pipe(
            tap(pairs => {
                this._versionPairs.set(pairs);
                this._isLoading.set(false);
                this.logger.info('Version pairs loaded', {
                    currentId: pairs.current.versionId,
                    previousId: pairs.previous.versionId,
                });
            }),
            catchError(err => {
                const errorCode = err?.error?.errorCode;
                if (errorCode === 'NO_PREVIOUS_VERSION') {
                    this._error.set('Предыдущая версия не найдена');
                } else {
                    this._error.set('Ошибка загрузки данных');
                }
                this._isLoading.set(false);
                this.logger.error('Failed to load version pairs', err);
                return of(undefined);
            }),
            shareReplay(1),
        );
        return this._load$;
    }
}
