import { AuthService } from '../../../../services/auth/auth.service';
import { PictureLightboxService } from '../../../../services/pictures/picture-lightbox.service';
import { PictureEditResult, PictureService } from '../../../../services/pictures/picture.service';
import { PictureDetailComponent } from './picture-detail.component';
import { PLATFORM_ID } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { NotificationService, WINDOW } from '@drevo-web/core';
import { Picture, PictureArticle, User } from '@drevo-web/shared';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { EMPTY, of, throwError } from 'rxjs';

const mockPicture: Picture = {
    id: 42,
    folder: '0000',
    title: 'Вид на Кремль',
    user: 'Иванов И.И.',
    date: new Date('2025-03-15'),
    width: 1920,
    height: 1280,
    imageUrl: '/images/0000/0042.jpg',
    thumbnailUrl: '/pictures/thumbs/0000/0042.jpg',
};

const mockArticles: readonly PictureArticle[] = [
    { id: 10, title: 'Москва' },
    { id: 20, title: 'Достопримечательности' },
];

const mockEditableUser: User = {
    id: 1,
    login: 'editor',
    name: 'Editor',
    email: 'editor@test.com',
    role: 'user',
    permissions: { canEdit: true, canModerate: false, canAdmin: false },
};

const mockReadonlyUser: User = {
    id: 2,
    login: 'guest',
    name: 'Guest',
    email: 'guest@test.com',
    role: 'guest',
    permissions: { canEdit: false, canModerate: false, canAdmin: false },
};

const mockWriteText = jest.fn().mockResolvedValue(undefined);
const mockWindow = {
    navigator: { clipboard: { writeText: mockWriteText } },
} as unknown as Window;

function enterEditMode(spectator: Spectator<PictureDetailComponent>): void {
    spectator.detectChanges();
    spectator.click('[data-testid="detail-title"]');
    spectator.detectChanges();
}

function setTitleValue(spectator: Spectator<PictureDetailComponent>, value: string): void {
    spectator.component.titleControl.setValue(value);
    spectator.component.titleControl.markAsDirty();
    spectator.detectChanges();
}

describe('PictureDetailComponent', () => {
    let spectator: Spectator<PictureDetailComponent>;
    let pictureService: jest.Mocked<PictureService>;

    describe('with picture data', () => {
        const createComponent = createComponentFactory({
            component: PictureDetailComponent,
            providers: [
                mockLoggerProvider(),
                mockProvider(PictureLightboxService),
                mockProvider(PictureService, {
                    getPictureArticles: jest.fn().mockReturnValue(of(mockArticles)),
                    updateTitle: jest.fn(),
                }),
                mockProvider(NotificationService),
                {
                    provide: AuthService,
                    useValue: { user$: of(mockEditableUser) },
                },
                {
                    provide: ActivatedRoute,
                    useValue: { data: of({ picture: mockPicture }) },
                },
                { provide: PLATFORM_ID, useValue: 'browser' },
                { provide: WINDOW, useValue: mockWindow },
            ],
            detectChanges: false,
        });

        beforeEach(() => {
            jest.clearAllMocks();
            spectator = createComponent();
            pictureService = spectator.inject(PictureService) as jest.Mocked<PictureService>;
            pictureService.getPictureArticles.mockReturnValue(of(mockArticles));
        });

        it('should create', () => {
            expect(spectator.component).toBeTruthy();
        });

        it('should display picture title', () => {
            spectator.detectChanges();
            const title = spectator.query('[data-testid="detail-title"]');
            expect(title).toBeTruthy();
            expect(title?.textContent?.trim()).toBe('Вид на Кремль');
        });

        it('should display image with correct src and alt', () => {
            spectator.detectChanges();
            const img = spectator.query('[data-testid="detail-image"] img') as HTMLImageElement;
            expect(img?.src).toContain('/images/0000/0042.jpg');
            expect(img?.alt).toBe('Вид на Кремль');
        });

        it('should display author name', () => {
            spectator.detectChanges();
            const author = spectator.query('[data-testid="detail-author"]');
            expect(author).toBeTruthy();
            expect(author?.textContent?.trim()).toBe('Иванов И.И.');
        });

        it('should display dimensions', () => {
            spectator.detectChanges();
            const dims = spectator.query('[data-testid="detail-dimensions"]');
            expect(dims).toBeTruthy();
            expect(dims?.textContent?.trim()).toBe('1920 × 1280 px');
        });

        it('should open lightbox on image click', () => {
            spectator.detectChanges();
            const lightbox = spectator.inject(PictureLightboxService);
            spectator.click('[data-testid="detail-image"]');
            expect(lightbox.open).toHaveBeenCalledWith(42);
        });

        it('should copy insert code to clipboard', () => {
            spectator.detectChanges();
            spectator.component.copyInsertCode();
            expect(mockWriteText).toHaveBeenCalledWith('@42@');
        });

        it('should load articles for the picture', () => {
            spectator.detectChanges();
            expect(pictureService.getPictureArticles).toHaveBeenCalledWith(42);
        });

        it('should display article links', () => {
            spectator.detectChanges();
            const links = spectator.queryAll('[data-testid="detail-article-link"]');
            expect(links).toHaveLength(2);
            expect(links[0].textContent?.trim()).toBe('Москва');
            expect(links[1].textContent?.trim()).toBe('Достопримечательности');
        });

        it('should link articles to correct routes', () => {
            spectator.detectChanges();
            const links = spectator.queryAll<HTMLAnchorElement>('[data-testid="detail-article-link"]');
            expect(links[0].getAttribute('href')).toBe('/articles/10');
            expect(links[1].getAttribute('href')).toBe('/articles/20');
        });

        it('should show empty state when no articles', () => {
            pictureService.getPictureArticles.mockReturnValue(of([]));
            spectator.detectChanges();
            const empty = spectator.query('[data-testid="detail-articles-empty"]');
            expect(empty).toBeTruthy();
            expect(empty?.textContent?.trim()).toBe('Нет');
        });

        it('should show error state when articles fail to load', () => {
            pictureService.getPictureArticles.mockReturnValue(throwError(() => new Error('Network error')));
            spectator.detectChanges();
            const error = spectator.query('[data-testid="detail-articles-error"]');
            expect(error).toBeTruthy();
            expect(error?.textContent?.trim()).toBe('Не удалось загрузить');
        });

        describe('title editing', () => {
            it('should show editable class on title', () => {
                spectator.detectChanges();
                const title = spectator.query('[data-testid="detail-title"]');
                expect(title?.classList).toContain('detail__value--editable');
            });

            it('should enter edit mode on title click', () => {
                enterEditMode(spectator);
                const input = spectator.query<HTMLTextAreaElement>('[data-testid="detail-title-input"]');
                expect(input).toBeTruthy();
                expect(spectator.component.titleControl.value).toBe('Вид на Кремль');
            });

            it('should cancel edit on Escape', () => {
                enterEditMode(spectator);
                spectator.dispatchKeyboardEvent('[data-testid="detail-title-input"]', 'keydown', 'Escape');
                spectator.detectChanges();
                expect(spectator.query('[data-testid="detail-title-input"]')).toBeNull();
                expect(spectator.query('[data-testid="detail-title"]')).toBeTruthy();
            });

            it('should save on blur with unchanged value (closes edit mode)', () => {
                enterEditMode(spectator);
                spectator.dispatchFakeEvent('[data-testid="detail-title-input"]', 'blur');
                spectator.detectChanges();
                expect(spectator.query('[data-testid="detail-title-input"]')).toBeNull();
                expect(pictureService.updateTitle).not.toHaveBeenCalled();
            });

            it('should save on blur with changed value', () => {
                const mockResult: PictureEditResult = {
                    picture: { ...mockPicture, title: 'Новый заголовок' },
                    pending: undefined,
                };
                pictureService.updateTitle.mockReturnValue(of(mockResult));
                enterEditMode(spectator);
                setTitleValue(spectator, 'Новый заголовок');
                spectator.dispatchFakeEvent('[data-testid="detail-title-input"]', 'blur');
                expect(pictureService.updateTitle).toHaveBeenCalledWith(42, 'Новый заголовок');
            });

            it('should cancel on blur with invalid value', () => {
                enterEditMode(spectator);
                setTitleValue(spectator, 'Ab');
                spectator.dispatchFakeEvent('[data-testid="detail-title-input"]', 'blur');
                spectator.detectChanges();
                expect(spectator.query('[data-testid="detail-title-input"]')).toBeNull();
                expect(pictureService.updateTitle).not.toHaveBeenCalled();
            });

            it('should not save unchanged title', () => {
                enterEditMode(spectator);
                spectator.dispatchKeyboardEvent('[data-testid="detail-title-input"]', 'keydown', 'Enter');
                spectator.detectChanges();
                expect(pictureService.updateTitle).not.toHaveBeenCalled();
                expect(spectator.query('[data-testid="detail-title-input"]')).toBeNull();
            });

            it('should show validation error for short title during input', () => {
                enterEditMode(spectator);
                setTitleValue(spectator, 'Ab');
                const error = spectator.query('[data-testid="detail-title-error"]');
                expect(error).toBeTruthy();
                expect(error?.textContent?.trim()).toBe('Минимум 5 символов');
            });

            it('should not show validation error before user types', () => {
                enterEditMode(spectator);
                expect(spectator.component.titleControl.dirty).toBe(false);
                expect(spectator.query('[data-testid="detail-title-error"]')).toBeNull();
            });

            it('should not save invalid title on Enter', () => {
                enterEditMode(spectator);
                setTitleValue(spectator, 'Ab');
                spectator.dispatchKeyboardEvent('[data-testid="detail-title-input"]', 'keydown', 'Enter');
                spectator.detectChanges();
                expect(pictureService.updateTitle).not.toHaveBeenCalled();
            });

            it('should call updateTitle on Enter with changed value', () => {
                const mockResult: PictureEditResult = {
                    picture: { ...mockPicture, title: 'Новый заголовок' },
                    pending: undefined,
                };
                pictureService.updateTitle.mockReturnValue(of(mockResult));
                enterEditMode(spectator);
                setTitleValue(spectator, 'Новый заголовок');
                spectator.dispatchKeyboardEvent('[data-testid="detail-title-input"]', 'keydown', 'Enter');
                expect(pictureService.updateTitle).toHaveBeenCalledWith(42, 'Новый заголовок');
            });

            it('should update displayed title on moderator save', () => {
                const mockResult: PictureEditResult = {
                    picture: { ...mockPicture, title: 'Новый заголовок' },
                    pending: undefined,
                };
                pictureService.updateTitle.mockReturnValue(of(mockResult));
                const notification = spectator.inject(NotificationService);
                enterEditMode(spectator);
                setTitleValue(spectator, 'Новый заголовок');
                spectator.dispatchKeyboardEvent('[data-testid="detail-title-input"]', 'keydown', 'Enter');
                spectator.detectChanges();
                const title = spectator.query('[data-testid="detail-title"]');
                expect(title?.textContent?.trim()).toBe('Новый заголовок');
                expect(notification.success).toHaveBeenCalledWith('Описание обновлено');
            });

            it('should show moderation message for user save', () => {
                const mockResult: PictureEditResult = {
                    picture: undefined,
                    pending: {
                        id: 1,
                        pictureId: 42,
                        pendingType: 'edit_title',
                        title: 'Новый заголовок',
                        width: undefined,
                        height: undefined,
                        user: 'editor',
                        date: new Date(),
                        currentTitle: 'Вид на Кремль',
                        currentImageUrl: '/images/0000/0042.jpg',
                        currentThumbnailUrl: '/pictures/thumbs/0000/0042.jpg',
                        currentWidth: 1920,
                        currentHeight: 1280,
                        pendingImageUrl: undefined,
                    },
                };
                pictureService.updateTitle.mockReturnValue(of(mockResult));
                const notification = spectator.inject(NotificationService);
                enterEditMode(spectator);
                setTitleValue(spectator, 'Новый заголовок');
                spectator.dispatchKeyboardEvent('[data-testid="detail-title-input"]', 'keydown', 'Enter');
                spectator.detectChanges();
                expect(notification.info).toHaveBeenCalledWith('Изменение отправлено на модерацию');
                const title = spectator.query('[data-testid="detail-title"]');
                expect(title?.textContent?.trim()).toBe('Вид на Кремль');
            });

            it('should show error notification on API failure', () => {
                pictureService.updateTitle.mockReturnValue(throwError(() => new Error('Server error')));
                const notification = spectator.inject(NotificationService);
                enterEditMode(spectator);
                setTitleValue(spectator, 'Новый заголовок');
                spectator.dispatchKeyboardEvent('[data-testid="detail-title-input"]', 'keydown', 'Enter');
                spectator.detectChanges();
                expect(notification.error).toHaveBeenCalledWith('Не удалось обновить описание');
                expect(spectator.query('[data-testid="detail-title-input"]')).toBeTruthy();
            });
        });
    });

    describe('without edit permission', () => {
        const createComponent = createComponentFactory({
            component: PictureDetailComponent,
            providers: [
                mockLoggerProvider(),
                mockProvider(PictureLightboxService),
                mockProvider(PictureService, { getPictureArticles: jest.fn().mockReturnValue(of(mockArticles)) }),
                mockProvider(NotificationService),
                { provide: AuthService, useValue: { user$: of(mockReadonlyUser) } },
                {
                    provide: ActivatedRoute,
                    useValue: { data: of({ picture: mockPicture }) },
                },
                { provide: PLATFORM_ID, useValue: 'browser' },
                { provide: WINDOW, useValue: mockWindow },
            ],
            detectChanges: false,
        });

        beforeEach(() => {
            spectator = createComponent();
        });

        it('should not show editable class on title', () => {
            spectator.detectChanges();
            const title = spectator.query('[data-testid="detail-title"]');
            expect(title).toBeTruthy();
            expect(title?.classList).not.toContain('detail__value--editable');
        });

        it('should not enter edit mode on title click', () => {
            spectator.detectChanges();
            spectator.click('[data-testid="detail-title"]');
            spectator.detectChanges();
            expect(spectator.query('[data-testid="detail-title-input"]')).toBeNull();
        });
    });

    describe('with not-found result', () => {
        const createComponent = createComponentFactory({
            component: PictureDetailComponent,
            providers: [
                mockLoggerProvider(),
                mockProvider(PictureLightboxService),
                mockProvider(PictureService, { getPictureArticles: jest.fn().mockReturnValue(EMPTY) }),
                mockProvider(NotificationService),
                { provide: AuthService, useValue: { user$: of(mockEditableUser) } },
                {
                    provide: ActivatedRoute,
                    useValue: { data: of({ picture: 'not-found' }) },
                },
                { provide: PLATFORM_ID, useValue: 'browser' },
                { provide: WINDOW, useValue: mockWindow },
            ],
            detectChanges: false,
        });

        beforeEach(() => {
            spectator = createComponent();
        });

        it('should show not-found error', () => {
            spectator.detectChanges();
            const error = spectator.query('[data-testid="detail-error"]');
            expect(error).toBeTruthy();
            expect(error?.textContent).toContain('Иллюстрация не найдена');
        });
    });

    describe('with load-error result', () => {
        const createComponent = createComponentFactory({
            component: PictureDetailComponent,
            providers: [
                mockLoggerProvider(),
                mockProvider(PictureLightboxService),
                mockProvider(PictureService, { getPictureArticles: jest.fn().mockReturnValue(EMPTY) }),
                mockProvider(NotificationService),
                { provide: AuthService, useValue: { user$: of(mockEditableUser) } },
                {
                    provide: ActivatedRoute,
                    useValue: { data: of({ picture: 'load-error' }) },
                },
                { provide: PLATFORM_ID, useValue: 'browser' },
                { provide: WINDOW, useValue: mockWindow },
            ],
            detectChanges: false,
        });

        beforeEach(() => {
            spectator = createComponent();
        });

        it('should show load error', () => {
            spectator.detectChanges();
            const error = spectator.query('[data-testid="detail-load-error"]');
            expect(error).toBeTruthy();
            expect(error?.textContent).toContain('Ошибка загрузки');
        });
    });
});
