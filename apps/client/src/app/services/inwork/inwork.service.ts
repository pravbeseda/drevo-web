import { InworkApiService } from './inwork-api.service';
import { Injectable, inject } from '@angular/core';
import { LoggerService } from '@drevo-web/core';
import { InworkItem, InworkItemDto } from '@drevo-web/shared';
import { EMPTY, Observable, catchError, map } from 'rxjs';

const INWORK_MODULE = 'articles';

@Injectable({
    providedIn: 'root',
})
export class InworkService {
    private readonly inworkApiService = inject(InworkApiService);
    private readonly logger = inject(LoggerService).withContext('InworkService');

    checkEditor(title: string): Observable<string | undefined> {
        return this.inworkApiService.check(INWORK_MODULE, title).pipe(
            map(response => response.editor || undefined),
            catchError(err => {
                this.logger.error('Failed to check inwork status', err);
                return EMPTY;
            }),
        );
    }

    getInworkList(): Observable<InworkItem[]> {
        return this.inworkApiService.getList().pipe(
            map(items => items.map(dto => this.mapItem(dto))),
            catchError(err => {
                this.logger.error('Failed to get inwork list', err);
                return EMPTY;
            }),
        );
    }

    markEditing(title: string, versionId: number): Observable<void> {
        return this.inworkApiService.markEditing(INWORK_MODULE, title, versionId).pipe(
            catchError(err => {
                this.logger.error('Failed to mark article as editing', err);
                return EMPTY;
            }),
        );
    }

    clearEditing(title: string): Observable<void> {
        return this.inworkApiService.clearEditing(INWORK_MODULE, title).pipe(
            catchError(err => {
                this.logger.error('Failed to clear editing mark', err);
                return EMPTY;
            }),
        );
    }

    private mapItem(dto: InworkItemDto): InworkItem {
        return {
            id: dto.id,
            module: dto.module,
            title: dto.title,
            author: dto.author,
            lasttime: dto.lasttime,
            age: dto.age,
        };
    }
}
