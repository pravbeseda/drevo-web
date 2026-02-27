import { ArticleService } from '../../../services/articles/article.service';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';
import { LoggerService, NotificationService } from '@drevo-web/core';
import { ApprovalStatus, ArticleVersion, ModerationResult } from '@drevo-web/shared';
import { of, throwError } from 'rxjs';
import { ArticleModerationPanelComponent } from './article-moderation-panel.component';

const mockVersion: ArticleVersion = {
    articleId: 1,
    versionId: 200,
    content: 'new content',
    author: 'Author A',
    date: new Date('2025-01-15T14:30:00'),
    title: 'Test Article',
    info: 'Updated text',
    approved: ApprovalStatus.Pending,
    redirect: false,
    new: false,
    comment: '',
};

const mockModerationResult: ModerationResult = {
    versionId: 200,
    articleId: 1,
    approved: ApprovalStatus.Approved,
    comment: '',
};

describe('ArticleModerationPanelComponent', () => {
    let spectator: Spectator<ArticleModerationPanelComponent>;
    let articleService: jest.Mocked<ArticleService>;
    let notificationService: jest.Mocked<NotificationService>;

    const createComponent = createComponentFactory({
        component: ArticleModerationPanelComponent,
        providers: [mockLoggerProvider(), mockProvider(ArticleService), mockProvider(NotificationService)],
        detectChanges: false,
    });

    beforeEach(() => {
        spectator = createComponent({ props: { version: mockVersion } });
        articleService = spectator.inject(ArticleService) as jest.Mocked<ArticleService>;
        notificationService = spectator.inject(NotificationService) as jest.Mocked<NotificationService>;
    });

    it('should create', () => {
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    describe('status computation', () => {
        it('should compute statusText for pending version', () => {
            spectator.detectChanges();
            expect(spectator.component.statusText()).toBe('На проверке');
        });

        it('should compute statusText for approved version', () => {
            spectator.setInput('version', { ...mockVersion, approved: ApprovalStatus.Approved });
            spectator.detectChanges();
            expect(spectator.component.statusText()).toBe('Одобрено');
        });

        it('should compute statusText for rejected version', () => {
            spectator.setInput('version', { ...mockVersion, approved: ApprovalStatus.Rejected });
            spectator.detectChanges();
            expect(spectator.component.statusText()).toBe('Отклонено');
        });
    });

    describe('status flags', () => {
        it('should detect pending status', () => {
            spectator.detectChanges();
            expect(spectator.component.isPending()).toBe(true);
            expect(spectator.component.isApproved()).toBe(false);
            expect(spectator.component.isRejected()).toBe(false);
        });

        it('should detect approved status', () => {
            spectator.setInput('version', { ...mockVersion, approved: ApprovalStatus.Approved });
            spectator.detectChanges();
            expect(spectator.component.isApproved()).toBe(true);
            expect(spectator.component.isPending()).toBe(false);
            expect(spectator.component.isRejected()).toBe(false);
        });

        it('should detect rejected status', () => {
            spectator.setInput('version', { ...mockVersion, approved: ApprovalStatus.Rejected });
            spectator.detectChanges();
            expect(spectator.component.isRejected()).toBe(true);
            expect(spectator.component.isApproved()).toBe(false);
            expect(spectator.component.isPending()).toBe(false);
        });
    });

    describe('comment handling', () => {
        it('should update comment on change', () => {
            spectator.detectChanges();
            spectator.component.onCommentChange('Test comment');
            expect(spectator.component.comment()).toBe('Test comment');
        });

        it('should start with empty comment when version has no comment', () => {
            spectator.detectChanges();
            expect(spectator.component.comment()).toBe('');
        });

        it('should initialize comment from version', () => {
            spectator.setInput('version', { ...mockVersion, comment: 'Existing comment' });
            spectator.detectChanges();
            expect(spectator.component.comment()).toBe('Existing comment');
        });

        it('should update comment when version input changes', () => {
            spectator.detectChanges();
            expect(spectator.component.comment()).toBe('');

            spectator.setInput('version', { ...mockVersion, comment: 'Updated comment' });
            spectator.detectChanges();
            expect(spectator.component.comment()).toBe('Updated comment');
        });
    });

    describe('approve', () => {
        it('should call moderateVersion with Approved status', () => {
            articleService.moderateVersion.mockReturnValue(of(mockModerationResult));
            spectator.detectChanges();

            spectator.component.approve();

            expect(articleService.moderateVersion).toHaveBeenCalledWith(200, ApprovalStatus.Approved, undefined);
        });

        it('should emit moderated event on success', () => {
            articleService.moderateVersion.mockReturnValue(of(mockModerationResult));
            spectator.detectChanges();
            const moderatedSpy = jest.fn();
            spectator.component.moderated.subscribe(moderatedSpy);

            spectator.component.approve();

            expect(moderatedSpy).toHaveBeenCalledWith(mockModerationResult);
        });

        it('should show success notification', () => {
            articleService.moderateVersion.mockReturnValue(of(mockModerationResult));
            spectator.detectChanges();

            spectator.component.approve();

            expect(notificationService.success).toHaveBeenCalledWith('Версия одобрена');
        });

        it('should pass comment when provided', () => {
            articleService.moderateVersion.mockReturnValue(of(mockModerationResult));
            spectator.detectChanges();
            spectator.component.onCommentChange('My comment');

            spectator.component.approve();

            expect(articleService.moderateVersion).toHaveBeenCalledWith(200, ApprovalStatus.Approved, 'My comment');
        });
    });

    describe('sendToReview', () => {
        it('should call moderateVersion with Pending status', () => {
            const result = { ...mockModerationResult, approved: ApprovalStatus.Pending };
            articleService.moderateVersion.mockReturnValue(of(result));
            spectator.detectChanges();

            spectator.component.sendToReview();

            expect(articleService.moderateVersion).toHaveBeenCalledWith(200, ApprovalStatus.Pending, undefined);
        });

        it('should show correct success message', () => {
            const result = { ...mockModerationResult, approved: ApprovalStatus.Pending };
            articleService.moderateVersion.mockReturnValue(of(result));
            spectator.detectChanges();

            spectator.component.sendToReview();

            expect(notificationService.success).toHaveBeenCalledWith('Версия отправлена на проверку');
        });
    });

    describe('reject', () => {
        it('should call moderateVersion with Rejected status', () => {
            const result = { ...mockModerationResult, approved: ApprovalStatus.Rejected };
            articleService.moderateVersion.mockReturnValue(of(result));
            spectator.detectChanges();

            spectator.component.reject();

            expect(articleService.moderateVersion).toHaveBeenCalledWith(200, ApprovalStatus.Rejected, undefined);
        });

        it('should show correct success message', () => {
            const result = { ...mockModerationResult, approved: ApprovalStatus.Rejected };
            articleService.moderateVersion.mockReturnValue(of(result));
            spectator.detectChanges();

            spectator.component.reject();

            expect(notificationService.success).toHaveBeenCalledWith('Версия отклонена');
        });
    });

    describe('loading state', () => {
        it('should set isLoading to true during request', () => {
            articleService.moderateVersion.mockReturnValue(of(mockModerationResult));
            spectator.detectChanges();

            expect(spectator.component.isLoading()).toBe(false);
        });

        it('should reset isLoading on success', () => {
            articleService.moderateVersion.mockReturnValue(of(mockModerationResult));
            spectator.detectChanges();

            spectator.component.approve();

            expect(spectator.component.isLoading()).toBe(false);
        });

        it('should reset isLoading on error', () => {
            articleService.moderateVersion.mockReturnValue(throwError(() => new Error('API error')));
            spectator.detectChanges();

            spectator.component.approve();

            expect(spectator.component.isLoading()).toBe(false);
        });
    });

    describe('error handling', () => {
        it('should show error notification on failure', () => {
            articleService.moderateVersion.mockReturnValue(throwError(() => new Error('API error')));
            spectator.detectChanges();

            spectator.component.approve();

            expect(notificationService.error).toHaveBeenCalledWith('Не удалось выполнить модерацию');
        });

        it('should log error on failure', () => {
            const error = new Error('API error');
            articleService.moderateVersion.mockReturnValue(throwError(() => error));
            spectator.detectChanges();

            spectator.component.approve();

            const loggerService = spectator.inject(LoggerService) as unknown as MockLoggerService;
            expect(loggerService.mockLogger.error).toHaveBeenCalledWith('Moderation: failed', error);
        });

        it('should not emit moderated on failure', () => {
            articleService.moderateVersion.mockReturnValue(throwError(() => new Error('API error')));
            spectator.detectChanges();
            const moderatedSpy = jest.fn();
            spectator.component.moderated.subscribe(moderatedSpy);

            spectator.component.approve();

            expect(moderatedSpy).not.toHaveBeenCalled();
        });
    });
});
