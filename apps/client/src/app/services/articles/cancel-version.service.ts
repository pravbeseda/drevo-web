import { ArticleService } from './article.service';
import { isCancelVersionConflict } from './cancel-version.errors';
import { Injectable, inject } from '@angular/core';
import { LoggerService, NotificationService } from '@drevo-web/core';
import { CancelVersionResult } from '@drevo-web/shared';
import { ConfirmationService } from '@drevo-web/ui';
import { EMPTY, Observable, catchError, filter, of, switchMap, tap } from 'rxjs';

/**
 * Orchestrates the cancel-version user flow: confirmation dialog, API call,
 * 409 INVALID_STATE handling, and notifications.
 *
 * Emits exactly when the caller should apply a new approval status to its UI:
 * - on success — with the resulting payload
 * - on 409 conflict — with the server-side actual payload
 * Completes empty when the dialog is dismissed or the request fails with
 * a non-conflict error.
 */
@Injectable()
export class CancelVersionService {
    private readonly articleService = inject(ArticleService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly notification = inject(NotificationService);
    private readonly logger = inject(LoggerService).withContext('CancelVersionService');

    cancelVersion(versionId: number): Observable<CancelVersionResult> {
        return this.confirmationService
            .open({
                title: 'Отмена версии',
                message:
                    'Отменить эту версию? Она перейдёт в статус «Отменена автором» и больше не будет ждать модератора.',
                buttons: [
                    { key: 'confirm', label: 'Отменить версию', accent: 'warning' },
                    { key: 'cancel', label: 'Закрыть' },
                ],
            })
            .pipe(
                filter(result => result === 'confirm'),
                switchMap(() =>
                    this.articleService.cancelVersion(versionId).pipe(
                        tap(result => {
                            this.logger.info('Version cancelled', {
                                versionId,
                                articleId: result.articleId,
                            });
                            this.notification.success('Версия отменена');
                        }),
                        catchError(err => {
                            if (isCancelVersionConflict(err)) {
                                const payload = err.error.data;
                                this.logger.info('Cancel race detected', {
                                    versionId,
                                    actual: payload.approved,
                                });
                                this.notification.info('Версия уже не в статусе «На проверке»');
                                return of<CancelVersionResult>({
                                    versionId: payload.versionId,
                                    articleId: payload.articleId,
                                    approved: payload.approved,
                                });
                            }
                            this.logger.error('Cancel version failed', err);
                            this.notification.error('Не удалось отменить версию');
                            return EMPTY;
                        }),
                    ),
                ),
            );
    }
}
