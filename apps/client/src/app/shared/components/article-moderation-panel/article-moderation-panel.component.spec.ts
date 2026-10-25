import { ArticleService } from '../../../services/articles/article.service';
import { ClipboardService } from '../../../services/clipboard/clipboard.service';
import { VersionForModeration } from '../../models/version-for-moderation.model';
import { createComponentFactory, mockProvider, Spectator, SpyObject } from '@ngneat/spectator/jest';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';
import { LoggerService, NotificationService } from '@drevo-web/core';
import { ApprovalStatus, ModerationResult } from '@drevo-web/shared';
import { of, throwError } from 'rxjs';
import { ModerationCheckComponent } from '../moderation-check/moderation-check.component';
import { ArticleModerationPanelComponent } from './article-moderation-panel.component';

const mockVersion: VersionForModeration = {
    versionId: 200,
    author: 'Author A',
    date: new Date('2025-01-15T14:30:00'),
    approved: ApprovalStatus.Pending,
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
    let notificationService: SpyObject<NotificationService>;

    const createComponent = createComponentFactory({
        component: ArticleModerationPanelComponent,
        providers: [
            mockLoggerProvider(),
            mockProvider(ArticleService),
            mockProvider(ClipboardService),
            mockProvider(NotificationService),
        ],
        detectChanges: false,
    });

    beforeEach(() => {
        spectator = createComponent({ props: { version: mockVersion } });
        articleService = spectator.inject(ArticleService);
        notificationService = spectator.inject(NotificationService);
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

    describe('comment copy', () => {
        const copyButton = '[data-testid="moderation-comment-copy"]';

        it('should copy the comment', () => {
            const clipboard = spectator.inject(ClipboardService);
            clipboard.copy.mockReturnValue(of(undefined));
            spectator.setInput('version', { ...mockVersion, comment: 'Прошу исправить:\nСтрока 1' });
            spectator.detectChanges();

            spectator.click(copyButton);

            expect(clipboard.copy).toHaveBeenCalledWith('Прошу исправить:\nСтрока 1');
            expect(notificationService.success).toHaveBeenCalledWith('Комментарий скопирован');
        });

        it('should report a failed copy', () => {
            const clipboard = spectator.inject(ClipboardService);
            const error = new Error('denied');
            clipboard.copy.mockReturnValue(throwError(() => error));
            spectator.setInput('version', { ...mockVersion, comment: 'Комментарий' });
            spectator.detectChanges();

            spectator.click(copyButton);

            expect(notificationService.error).toHaveBeenCalledWith('Не удалось скопировать комментарий');
            expect(
                (spectator.inject(LoggerService) as unknown as MockLoggerService).mockLogger.error,
            ).toHaveBeenCalledWith('Moderation: comment copy failed', error);
        });

        it('should offer no copy of an empty comment', () => {
            spectator.detectChanges();

            expect(spectator.query<HTMLButtonElement>(copyButton)?.disabled).toBe(true);
        });
    });

    describe('auto-check findings', () => {
        const texts = { current: 'Новый текст', previous: 'Старый текст' };
        const report = { scope: 'full', items: [], verdict: 'clean', counts: { serious: 0, fix: 0, hint: 0 } } as const;
        const item = {
            from: 0,
            to: 3,
            message: 'Слово повторяется: «и и»',
            ruleId: 'repeated-word',
            category: 'spelling',
            level: 'serious',
            fragment: 'и и',
            line: 1,
            isChanged: true,
            contextBefore: '',
            contextAfter: '',
        } as const;

        it('should wait for the texts before offering the check', () => {
            spectator.detectChanges();
            expect(spectator.query(ModerationCheckComponent)).toBeNull();
        });

        it('should check the texts it was given', () => {
            spectator.setInput('texts', texts);
            spectator.detectChanges();
            expect(spectator.query(ModerationCheckComponent)?.texts()).toBe(texts);
        });

        it('should pass the report and the selected finding up', () => {
            const reports: unknown[] = [];
            const selected: unknown[] = [];
            spectator.output('reportChanged').subscribe(value => reports.push(value));
            spectator.output('findingSelected').subscribe(value => selected.push(value));
            spectator.setInput('texts', texts);
            spectator.detectChanges();

            spectator.triggerEventHandler(ModerationCheckComponent, 'reportChanged', report);
            spectator.triggerEventHandler(ModerationCheckComponent, 'findingSelected', item);

            expect(reports).toEqual([report]);
            expect(selected).toEqual([item]);
        });

        it('should open an empty comment with a request to fix', () => {
            spectator.setInput('texts', texts);
            spectator.detectChanges();
            spectator.triggerEventHandler(ModerationCheckComponent, 'commentLinesAdded', ['Строка 1: «ихний» → «их»']);

            expect(spectator.component.comment()).toBe('Прошу исправить:\nСтрока 1: «ихний» → «их»');
        });

        it('should append the findings under an existing comment', () => {
            spectator.setInput({ version: { ...mockVersion, comment: 'Прошу исправить:\nСтрока 1' }, texts });
            spectator.detectChanges();
            spectator.triggerEventHandler(ModerationCheckComponent, 'commentLinesAdded', ['Строка 2', 'Строка 3']);

            expect(spectator.component.comment()).toBe('Прошу исправить:\nСтрока 1\nСтрока 2\nСтрока 3');
        });
    });

    describe('approve', () => {
        it('should call moderateVersion with Approved status', () => {
            articleService.moderateVersion.mockReturnValue(of(mockModerationResult));
            spectator.detectChanges();

            spectator.component.approve();

            expect(articleService.moderateVersion).toHaveBeenCalledWith(200, ApprovalStatus.Approved, '');
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

            expect(articleService.moderateVersion).toHaveBeenCalledWith(200, ApprovalStatus.Pending, '');
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

            expect(articleService.moderateVersion).toHaveBeenCalledWith(200, ApprovalStatus.Rejected, '');
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
