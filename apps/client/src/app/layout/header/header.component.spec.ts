import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { MockProvider } from 'ng-mocks';
import { of, throwError } from 'rxjs';
import { DrawerService, LogExportService, NotificationService, WINDOW } from '@drevo-web/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ModalService } from '@drevo-web/ui';
import { ArticleService } from '../../services/articles/article.service';
import { AuthService } from '../../services/auth/auth.service';
import { PageTitleStrategy, TitleContext } from '../../services/page-title.strategy';
import { HeaderComponent } from './header.component';

const createMockUser = (canModerate: boolean) => ({
    login: 'testuser',
    permissions: { canModerate },
});

const mockWindowObj = {
    getSelection: jest.fn(() => ({ isCollapsed: true })),
    localStorage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
    },
    matchMedia: jest.fn(() => ({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    })),
};

describe('HeaderComponent', () => {
    let spectator: Spectator<HeaderComponent>;

    const titleContextSignal = signal<TitleContext | undefined>(undefined);
    const pageTitleSignal = signal('Древо');
    const updateArticleTitleMock = jest.fn();
    const renameArticleMock = jest.fn();
    const successMock = jest.fn();
    const errorMock = jest.fn();

    const createComponent = createComponentFactory({
        component: HeaderComponent,
        providers: [
            provideRouter([]),
            mockLoggerProvider(),
            MockProvider(ModalService),
            MockProvider(LogExportService),
            MockProvider(PageTitleStrategy, {
                pageTitle: pageTitleSignal,
                titleContext: titleContextSignal,
                updateArticleTitle: updateArticleTitleMock,
            }),
            MockProvider(DrawerService, {
                isOpen: signal(true),
                toggle: jest.fn(),
            }),
            MockProvider(AuthService, {
                user$: of(createMockUser(true)),
                isLoading$: of(false),
            }),
            MockProvider(ArticleService, {
                renameArticle: renameArticleMock,
            }),
            MockProvider(NotificationService, {
                success: successMock,
                error: errorMock,
            }),
            {
                provide: WINDOW,
                useValue: mockWindowObj,
            },
        ],
    });

    beforeEach(() => {
        titleContextSignal.set(undefined);
        pageTitleSignal.set('Древо');
        mockWindowObj.getSelection.mockReturnValue({ isCollapsed: true });
        updateArticleTitleMock.mockClear();
        renameArticleMock.mockClear();
        successMock.mockClear();
        errorMock.mockClear();
    });

    it('should create', () => {
        spectator = createComponent();

        expect(spectator.component).toBeTruthy();
    });

    it('should call drawerService.toggle when toggleDrawer is called', () => {
        spectator = createComponent();
        const drawerService = spectator.inject(DrawerService);

        spectator.component.toggleDrawer();

        expect(drawerService.toggle).toHaveBeenCalled();
    });

    it('should display page title from PageTitleStrategy', () => {
        spectator = createComponent();

        expect(spectator.query('[data-testid="page-title"]')?.textContent?.trim()).toBe('Древо');
    });

    describe('canRename', () => {
        it('should be false when no titleContext (not article page)', () => {
            spectator = createComponent();

            expect(spectator.component.canRename()).toBe(false);
        });

        it('should be false when user is not moderator', () => {
            titleContextSignal.set({ articleId: 1, title: 'Test' });
            spectator = createComponent({
                providers: [
                    MockProvider(AuthService, {
                        user$: of(createMockUser(false)),
                        isLoading$: of(false),
                    }),
                ],
            });

            expect(spectator.component.canRename()).toBe(false);
        });

        it('should be true when user is moderator and on article page', () => {
            titleContextSignal.set({ articleId: 1, title: 'Test' });
            spectator = createComponent();

            expect(spectator.component.canRename()).toBe(true);
        });
    });

    describe('inline editing (moderator)', () => {
        beforeEach(() => {
            titleContextSignal.set({ articleId: 42, title: 'Старое название' });
            pageTitleSignal.set('Старое название');
            spectator = createComponent();
        });

        it('should open editing on click', () => {
            spectator.click('[data-testid="page-title"]');

            expect(spectator.query('[data-testid="page-title-input"]')).toBeTruthy();
        });

        it('should populate input with current title', () => {
            spectator.click('[data-testid="page-title"]');

            const input = spectator.query<HTMLInputElement>('[data-testid="page-title-input"]');
            expect(input?.value).toBe('Старое название');
        });

        it('should not open editing when user has selected text', () => {
            mockWindowObj.getSelection.mockReturnValue({ isCollapsed: false });
            spectator = createComponent();

            spectator.click('[data-testid="page-title"]');

            expect(spectator.query('[data-testid="page-title-input"]')).toBeNull();
        });

        it('should close editing on Escape without saving', () => {
            spectator.click('[data-testid="page-title"]');
            expect(spectator.query('[data-testid="page-title-input"]')).toBeTruthy();

            spectator.dispatchKeyboardEvent('[data-testid="page-title-input"]', 'keydown', 'Escape');

            expect(spectator.query('[data-testid="page-title-input"]')).toBeNull();
            expect(renameArticleMock).not.toHaveBeenCalled();
        });

        it('should call renameArticle on Enter with trimmed value', () => {
            renameArticleMock.mockReturnValue(of({ articleId: 42, title: 'Новое название' }));

            spectator.click('[data-testid="page-title"]');
            spectator.component.titleControl.setValue('  Новое название  ');
            spectator.dispatchKeyboardEvent('[data-testid="page-title-input"]', 'keydown', 'Enter');

            expect(renameArticleMock).toHaveBeenCalledWith(42, 'Новое название');
        });

        it('should not call renameArticle when title unchanged', () => {
            spectator.click('[data-testid="page-title"]');
            spectator.dispatchKeyboardEvent('[data-testid="page-title-input"]', 'keydown', 'Enter');

            expect(renameArticleMock).not.toHaveBeenCalled();
        });

        it('should not call renameArticle when title is empty', () => {
            spectator.click('[data-testid="page-title"]');
            spectator.component.titleControl.setValue('   ');
            spectator.dispatchKeyboardEvent('[data-testid="page-title-input"]', 'keydown', 'Enter');

            expect(renameArticleMock).not.toHaveBeenCalled();
        });

        it('should update title and show success notification on successful rename', () => {
            renameArticleMock.mockReturnValue(of({ articleId: 42, title: 'Новое' }));

            spectator.click('[data-testid="page-title"]');
            spectator.component.titleControl.setValue('Новое');
            spectator.dispatchKeyboardEvent('[data-testid="page-title-input"]', 'keydown', 'Enter');

            expect(updateArticleTitleMock).toHaveBeenCalledWith('Новое');
            expect(successMock).toHaveBeenCalledWith('Статья переименована');
            expect(spectator.query('[data-testid="page-title-input"]')).toBeNull();
        });

        it('should show specific error for TITLE_ALREADY_EXISTS', () => {
            const error = new HttpErrorResponse({
                status: 409,
                error: { errorCode: 'TITLE_ALREADY_EXISTS' },
            });
            renameArticleMock.mockReturnValue(throwError(() => error));

            spectator.click('[data-testid="page-title"]');
            spectator.component.titleControl.setValue('Дубликат');
            spectator.dispatchKeyboardEvent('[data-testid="page-title-input"]', 'keydown', 'Enter');

            expect(errorMock).toHaveBeenCalledWith('Статья с таким названием уже существует');
            expect(spectator.query('[data-testid="page-title-input"]')).toBeTruthy();
        });

        it('should show generic error for other failures', () => {
            renameArticleMock.mockReturnValue(throwError(() => new Error('Network error')));

            spectator.click('[data-testid="page-title"]');
            spectator.component.titleControl.setValue('Новое');
            spectator.dispatchKeyboardEvent('[data-testid="page-title-input"]', 'keydown', 'Enter');

            expect(errorMock).toHaveBeenCalledWith('Не удалось переименовать статью');
            expect(spectator.query('[data-testid="page-title-input"]')).toBeTruthy();
        });

        it('should save on blur', () => {
            renameArticleMock.mockReturnValue(of({ articleId: 42, title: 'Новое' }));

            spectator.click('[data-testid="page-title"]');
            spectator.component.titleControl.setValue('Новое');
            spectator.dispatchFakeEvent('[data-testid="page-title-input"]', 'blur');

            expect(renameArticleMock).toHaveBeenCalledWith(42, 'Новое');
        });

        it('should add editable class', () => {
            expect(spectator.query('.page-title--editable')).toBeTruthy();
        });
    });

    describe('inline editing (non-moderator)', () => {
        beforeEach(() => {
            titleContextSignal.set({ articleId: 42, title: 'Старое название' });
            pageTitleSignal.set('Старое название');
        });

        it('should not open editing on click', () => {
            spectator = createComponent({
                providers: [
                    MockProvider(AuthService, {
                        user$: of(createMockUser(false)),
                        isLoading$: of(false),
                    }),
                ],
            });

            spectator.click('[data-testid="page-title"]');

            expect(spectator.query('[data-testid="page-title-input"]')).toBeNull();
        });

        it('should not add editable class', () => {
            spectator = createComponent({
                providers: [
                    MockProvider(AuthService, {
                        user$: of(createMockUser(false)),
                        isLoading$: of(false),
                    }),
                ],
            });

            expect(spectator.query('.page-title--editable')).toBeNull();
        });
    });
});
