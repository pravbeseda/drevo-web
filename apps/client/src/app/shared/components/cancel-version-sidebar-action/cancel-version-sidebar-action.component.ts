import { ArticleService } from '../../../services/articles/article.service';
import { isCancelVersionConflict } from '../../../services/articles/cancel-version.errors';
import { AuthService } from '../../../services/auth/auth.service';
import { VersionForModeration } from '../../models/version-for-moderation.model';
import { SidebarActionComponent } from '../sidebar-action/sidebar-action.component';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { LoggerService, NotificationService } from '@drevo-web/core';
import { ApprovalStatus, CancelVersionResult, SidebarActionPriority } from '@drevo-web/shared';
import { ConfirmationService } from '@drevo-web/ui';
import { EMPTY, catchError, filter, switchMap, tap } from 'rxjs';

@Component({
    selector: 'app-cancel-version-sidebar-action',
    imports: [SidebarActionComponent],
    templateUrl: './cancel-version-sidebar-action.component.html',
    styleUrl: './cancel-version-sidebar-action.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CancelVersionSidebarActionComponent {
    readonly version = input.required<VersionForModeration>();
    readonly disabled = input(false);
    readonly priority = input<SidebarActionPriority>('secondary');

    readonly cancelled = output<CancelVersionResult>();

    private readonly authService = inject(AuthService);
    private readonly articleService = inject(ArticleService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly notification = inject(NotificationService);
    private readonly logger = inject(LoggerService).withContext('CancelVersionSidebarAction');

    private readonly user = toSignal(this.authService.user$);

    readonly canCancel = computed(() => {
        const user = this.user();
        const version = this.version();
        return !!user && version.author === user.name && version.approved === ApprovalStatus.Pending;
    });

    onActivated(): void {
        const versionId = this.version().versionId;

        this.confirmationService
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
                            this.logger.info('Version cancelled', { versionId, articleId: result.articleId });
                            this.notification.success('Версия отменена');
                            this.cancelled.emit(result);
                        }),
                        catchError(err => {
                            if (isCancelVersionConflict(err)) {
                                const payload = err.error.data;
                                this.logger.info('Cancel race detected', {
                                    versionId,
                                    actual: payload.approved,
                                });
                                this.notification.info('Версия уже не в статусе «На проверке»');
                                this.cancelled.emit({
                                    versionId: payload.versionId,
                                    articleId: payload.articleId,
                                    approved: payload.approved,
                                });
                                return EMPTY;
                            }
                            this.logger.error('Cancel version failed', err);
                            this.notification.error('Не удалось отменить версию');
                            return EMPTY;
                        }),
                    ),
                ),
            )
            .subscribe();
    }
}
