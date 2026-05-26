import { ArticleService } from './article.service';
import { CancelVersionService } from './cancel-version.service';
import { HttpErrorResponse } from '@angular/common/http';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { NotificationService } from '@drevo-web/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ApprovalStatus, CancelVersionResult } from '@drevo-web/shared';
import { ConfirmationService } from '@drevo-web/ui';
import { of, throwError } from 'rxjs';

describe('CancelVersionService', () => {
    let spectator: SpectatorService<CancelVersionService>;
    let articleService: jest.Mocked<ArticleService>;
    let confirmation: jest.Mocked<ConfirmationService>;
    let notification: jest.Mocked<NotificationService>;

    const createService = createServiceFactory({
        service: CancelVersionService,
        mocks: [ArticleService, NotificationService, ConfirmationService],
        providers: [mockLoggerProvider()],
    });

    beforeEach(() => {
        spectator = createService();
        articleService = spectator.inject(ArticleService) as jest.Mocked<ArticleService>;
        confirmation = spectator.inject(ConfirmationService) as jest.Mocked<ConfirmationService>;
        notification = spectator.inject(NotificationService) as jest.Mocked<NotificationService>;
    });

    it('does not call the API when confirmation is dismissed', () => {
        confirmation.open.mockReturnValue(of('cancel'));

        const emitSpy = jest.fn();
        spectator.service.cancelVersion(42).subscribe(emitSpy);

        expect(articleService.cancelVersion).not.toHaveBeenCalled();
        expect(emitSpy).not.toHaveBeenCalled();
    });

    it('emits the result and shows success notification on success', () => {
        const result: CancelVersionResult = {
            versionId: 42,
            articleId: 100,
            approved: ApprovalStatus.Cancelled,
        };
        confirmation.open.mockReturnValue(of('confirm'));
        articleService.cancelVersion.mockReturnValue(of(result));

        const emitSpy = jest.fn();
        spectator.service.cancelVersion(42).subscribe(emitSpy);

        expect(articleService.cancelVersion).toHaveBeenCalledWith(42);
        expect(notification.success).toHaveBeenCalledWith('Версия отменена');
        expect(emitSpy).toHaveBeenCalledWith(result);
    });

    it('on 409 conflict: emits server payload and shows info notification', () => {
        confirmation.open.mockReturnValue(of('confirm'));
        const conflictError = new HttpErrorResponse({
            status: 409,
            error: {
                errorCode: 'INVALID_STATE',
                data: { versionId: 42, articleId: 100, approved: ApprovalStatus.Approved },
            },
        });
        articleService.cancelVersion.mockReturnValue(throwError(() => conflictError));

        const emitSpy = jest.fn();
        spectator.service.cancelVersion(42).subscribe(emitSpy);

        expect(notification.info).toHaveBeenCalledWith('Версия уже не в статусе «На проверке»');
        expect(emitSpy).toHaveBeenCalledWith({
            versionId: 42,
            articleId: 100,
            approved: ApprovalStatus.Approved,
        });
    });

    it('on other errors: shows error notification, does not emit', () => {
        confirmation.open.mockReturnValue(of('confirm'));
        articleService.cancelVersion.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

        const emitSpy = jest.fn();
        spectator.service.cancelVersion(42).subscribe(emitSpy);

        expect(notification.error).toHaveBeenCalledWith('Не удалось отменить версию');
        expect(emitSpy).not.toHaveBeenCalled();
    });
});
