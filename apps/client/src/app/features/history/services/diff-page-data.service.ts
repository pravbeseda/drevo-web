import { ArticleService } from '../../../services/articles/article.service';
import { parsePositiveIntParam, readRouteParam } from '../../../shared/helpers/route-params';
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Logger, LoggerService, readApiErrorBody } from '@drevo-web/core';
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
        const id1Param = readRouteParam(snapshot, 'id1') ?? readRouteParam(snapshot, 'id');
        const id2Param = readRouteParam(snapshot, 'id2');
        // The key is built from the values the load below uses, so that a
        // rejected address and an accepted one cannot share a cache entry.
        const paramsKey = `${id1Param}_${id2Param ?? ''}`;

        if (this._load$ && this._loadedParams === paramsKey) return this._load$;

        this._loadedParams = paramsKey;
        this._isLoading.set(true);
        this._error.set(undefined);
        this._versionPairs.set(undefined);
        this._load$ = undefined;

        const version1 = parsePositiveIntParam(id1Param);

        if (version1 === undefined) {
            this._error.set('Неверный ID версии');
            this._isLoading.set(false);
            this.logger.error('Invalid version ID in route', id1Param);
            this._load$ = of(undefined);
            return this._load$;
        }

        let newer: number;
        let older: number | undefined;

        if (id2Param !== undefined) {
            const version2 = parsePositiveIntParam(id2Param);
            if (version2 === undefined) {
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
            catchError((err: unknown) => {
                const errorCode = err instanceof HttpErrorResponse ? readApiErrorBody(err)?.errorCode : undefined;
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
