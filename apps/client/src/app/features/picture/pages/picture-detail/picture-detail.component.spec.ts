import { AuthService } from '../../../../services/auth/auth.service';
import { PictureLightboxService } from '../../../../services/pictures/picture-lightbox.service';
import { PictureEditResult, PictureService } from '../../../../services/pictures/picture.service';
import { PictureDetailComponent } from './picture-detail.component';
import { HttpErrorResponse } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { NotificationService, WINDOW } from '@drevo-web/core';
import { Picture, PictureArticle, PicturePending, User } from '@drevo-web/shared';
import { ConfirmationService, ModalService } from '@drevo-web/ui';
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

function createPending(overrides: Partial<PicturePending> = {}): PicturePending {
    return {
        id: 1,
        pictureId: 42,
        pendingType: 'edit_title',
        title: 'Новый заголовок',
        width: undefined,
        height: undefined,
        user: 'Editor',
        date: new Date('2025-03-11T10:00:00Z'),
        currentTitle: 'Вид на Кремль',
        currentImageUrl: '/images/0000/0042.jpg',
        currentThumbnailUrl: '/pictures/thumbs/0000/0042.jpg',
        currentWidth: 1920,
        currentHeight: 1280,
        pendingImageUrl: undefined,
        ...overrides,
    };
}

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
                    getPicturePending: jest.fn().mockReturnValue(of([])),
                    updateTitle: jest.fn(),
                    editPicture: jest.fn(),
                    deletePicture: jest.fn(),
                    cancelPending: jest.fn(),
                    approvePending: jest.fn(),
                    rejectPending: jest.fn(),
                }),
                mockProvider(ModalService),
                mockProvider(ConfirmationService),
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
            pictureService.getPicturePending.mockReturnValue(of([]));
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

        it('should load pending changes for the picture', () => {
            spectator.detectChanges();
            expect(pictureService.getPicturePending).toHaveBeenCalledWith(42);
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

        describe('pending banners', () => {
            it('should render all pending banners returned by backend', () => {
                pictureService.getPicturePending.mockReturnValue(
                    of([
                        createPending({ id: 1, title: 'Первый pending' }),
                        createPending({
                            id: 2,
                            user: 'Другой пользователь',
                            title: 'Второй pending',
                            pendingType: 'edit_both',
                            pendingImageUrl: '/images/pending/42_pp2.jpg',
                        }),
                    ]),
                );

                spectator.detectChanges();

                expect(spectator.queryAll('[data-testid="pending-banner"]')).toHaveLength(2);
                expect(spectator.queryAll('[data-testid="pending-banner-text"]')[0]).toHaveText(
                    'Изменение описания — ожидает модерации',
                );
            });

            it('should show cancel button for own pending', () => {
                pictureService.getPicturePending.mockReturnValue(of([createPending()]));

                spectator.detectChanges();

                expect(spectator.query('[data-testid="pending-banner-cancel"]')).toBeTruthy();
                expect(spectator.query('[data-testid="pending-banner-author"]')).toBeNull();
            });

            it('should show author for foreign pending to regular user', () => {
                pictureService.getPicturePending.mockReturnValue(of([createPending({ user: 'Другой пользователь' })]));

                spectator.detectChanges();

                expect(spectator.query('[data-testid="pending-banner-author"]')).toHaveText('Другой пользователь');
                expect(spectator.query('[data-testid="pending-banner-cancel"]')).toBeNull();
                expect(spectator.query('[data-testid="pending-banner-approve"]')).toBeNull();
            });

            it('should open lightbox with pending image preview', () => {
                const lightbox = spectator.inject(PictureLightboxService);
                pictureService.getPicturePending.mockReturnValue(
                    of([
                        createPending({
                            pendingType: 'edit_both',
                            pendingImageUrl: '/images/pending/42_pp1.jpg',
                            width: 1024,
                            height: 768,
                        }),
                    ]),
                );

                spectator.detectChanges();
                spectator.click('[data-testid="pending-banner-new-image"]');

                expect(lightbox.openWithPicture).toHaveBeenCalledWith(
                    expect.objectContaining({
                        id: 42,
                        title: 'Новый заголовок',
                        imageUrl: '/images/pending/42_pp1.jpg',
                        width: 1024,
                        height: 768,
                    }),
                );
            });

            it('should cancel own pending and refresh pending list', () => {
                pictureService.getPicturePending.mockReturnValue(of([createPending()]));
                pictureService.cancelPending.mockReturnValue(of(undefined));
                const notification = spectator.inject(NotificationService);

                spectator.detectChanges();
                spectator.click('[data-testid="pending-banner-cancel"]');

                expect(pictureService.cancelPending).toHaveBeenCalledWith(1);
                expect(notification.success).toHaveBeenCalledWith('Изменение отменено');
                expect(pictureService.getPicturePending).toHaveBeenCalledTimes(2);
            });

            it('should keep page working when pending loading fails', () => {
                pictureService.getPicturePending.mockReturnValue(throwError(() => new Error('Pending failed')));

                spectator.detectChanges();

                expect(spectator.queryAll('[data-testid="pending-banner"]')).toHaveLength(0);
                expect(spectator.query('[data-testid="detail-title"]')).toHaveText('Вид на Кремль');
            });
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
                    pending: createPending({ user: 'editor' }),
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
                expect(pictureService.getPicturePending).toHaveBeenCalledTimes(2);
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

        describe('file replacement', () => {
            function createValidFile(size = 100 * 1024): File {
                return new File([new ArrayBuffer(size)], 'photo.jpg', { type: 'image/jpeg' });
            }

            function createMockFileList(file: File): FileList {
                return Object.assign([file], {
                    item: (i: number) => (i === 0 ? file : null),
                    length: 1,
                }) as unknown as FileList;
            }

            function triggerFileSelect(s: Spectator<PictureDetailComponent>, file: File): void {
                s.detectChanges();
                const input = s.query<HTMLInputElement>('[data-testid="detail-file-input"]');
                expect(input).toBeTruthy();

                Object.defineProperty(input, 'files', { value: createMockFileList(file), configurable: true });
                input?.dispatchEvent(new Event('change'));
            }

            beforeEach(() => {
                globalThis.URL.createObjectURL = jest.fn().mockReturnValue('blob:preview-url');
                globalThis.URL.revokeObjectURL = jest.fn();
            });

            it('should show error for non-JPEG file', () => {
                const pngFile = new File([new ArrayBuffer(100)], 'photo.png', { type: 'image/png' });
                const notification = spectator.inject(NotificationService);

                triggerFileSelect(spectator, pngFile);

                expect(notification.error).toHaveBeenCalledWith('Допустимый формат — только JPEG');
            });

            it('should show error for file exceeding 500KB', () => {
                const largeFile = createValidFile(501 * 1024);
                const notification = spectator.inject(NotificationService);

                triggerFileSelect(spectator, largeFile);

                expect(notification.error).toHaveBeenCalledWith('Максимальный размер файла — 500 КБ');
            });

            it('should open dialog for valid file', () => {
                const modalService = spectator.inject(ModalService) as jest.Mocked<ModalService>;
                modalService.open.mockReturnValue(of(undefined));

                triggerFileSelect(spectator, createValidFile());

                expect(modalService.open).toHaveBeenCalledWith(
                    expect.any(Function),
                    expect.objectContaining({
                        data: { currentTitle: 'Вид на Кремль', previewUrl: 'blob:preview-url' },
                        width: '500px',
                    }),
                );
            });

            it('should revoke object URL on dialog cancel', () => {
                const modalService = spectator.inject(ModalService) as jest.Mocked<ModalService>;
                modalService.open.mockReturnValue(of(undefined));

                triggerFileSelect(spectator, createValidFile());

                expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview-url');
            });

            it('should not call editPicture on dialog cancel', () => {
                const modalService = spectator.inject(ModalService) as jest.Mocked<ModalService>;
                modalService.open.mockReturnValue(of(undefined));

                triggerFileSelect(spectator, createValidFile());

                expect(pictureService.editPicture).not.toHaveBeenCalled();
            });

            it('should call editPicture with FormData on confirm', () => {
                const modalService = spectator.inject(ModalService) as jest.Mocked<ModalService>;
                modalService.open.mockReturnValue(of({ title: 'Новое описание' }));
                const mockResult: PictureEditResult = {
                    picture: { ...mockPicture, title: 'Новое описание' },
                    pending: undefined,
                };
                pictureService.editPicture.mockReturnValue(of(mockResult));

                triggerFileSelect(spectator, createValidFile());

                expect(pictureService.editPicture).toHaveBeenCalledWith(42, expect.any(FormData));
                const formData = pictureService.editPicture.mock.calls[0][1] as FormData;
                expect(formData.get('pic_title')).toBe('Новое описание');
                expect(formData.get('file')).toBeTruthy();
            });

            it('should update image and title on moderator success', () => {
                const modalService = spectator.inject(ModalService) as jest.Mocked<ModalService>;
                modalService.open.mockReturnValue(of({ title: 'Новое описание' }));
                const updatedPicture: Picture = {
                    ...mockPicture,
                    title: 'Новое описание',
                    imageUrl: '/images/0000/0042.jpg?v=12345',
                };
                const mockResult: PictureEditResult = { picture: updatedPicture, pending: undefined };
                pictureService.editPicture.mockReturnValue(of(mockResult));
                const notification = spectator.inject(NotificationService);

                triggerFileSelect(spectator, createValidFile());
                spectator.detectChanges();

                expect(notification.success).toHaveBeenCalledWith('Файл заменён');
                expect(spectator.component.displayTitle()).toBe('Новое описание');
                expect(spectator.component.displayImageUrl()).toBe('/images/0000/0042.jpg?v=12345');
            });

            it('should show pending notification for regular user', () => {
                const modalService = spectator.inject(ModalService) as jest.Mocked<ModalService>;
                modalService.open.mockReturnValue(of({ title: 'Вид на Кремль' }));
                const mockResult: PictureEditResult = {
                    picture: undefined,
                    pending: createPending({
                        pendingType: 'edit_both',
                        title: 'Вид на Кремль',
                        user: 'editor',
                        pendingImageUrl: '/images/pending/42_pp1.jpg',
                    }),
                };
                pictureService.editPicture.mockReturnValue(of(mockResult));
                const notification = spectator.inject(NotificationService);

                triggerFileSelect(spectator, createValidFile());

                expect(notification.info).toHaveBeenCalledWith('Изменение отправлено на модерацию');
                expect(pictureService.getPicturePending).toHaveBeenCalledTimes(2);
            });

            it('should show error notification on upload failure', () => {
                const modalService = spectator.inject(ModalService) as jest.Mocked<ModalService>;
                modalService.open.mockReturnValue(of({ title: 'Вид на Кремль' }));
                pictureService.editPicture.mockReturnValue(throwError(() => new Error('Upload failed')));
                const notification = spectator.inject(NotificationService);

                triggerFileSelect(spectator, createValidFile());

                expect(notification.error).toHaveBeenCalledWith('Не удалось заменить файл');
            });

            it('should set uploading state during upload', () => {
                const modalService = spectator.inject(ModalService) as jest.Mocked<ModalService>;
                modalService.open.mockReturnValue(of({ title: 'Вид на Кремль' }));
                const mockResult: PictureEditResult = {
                    picture: { ...mockPicture },
                    pending: undefined,
                };
                pictureService.editPicture.mockReturnValue(of(mockResult));

                expect(spectator.component.isUploading()).toBe(false);

                triggerFileSelect(spectator, createValidFile());

                // After completion, uploading should be false again
                expect(spectator.component.isUploading()).toBe(false);
            });

            it('should revoke object URL after upload completes', () => {
                const modalService = spectator.inject(ModalService) as jest.Mocked<ModalService>;
                modalService.open.mockReturnValue(of({ title: 'Вид на Кремль' }));
                const mockResult: PictureEditResult = {
                    picture: { ...mockPicture },
                    pending: undefined,
                };
                pictureService.editPicture.mockReturnValue(of(mockResult));

                triggerFileSelect(spectator, createValidFile());

                expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview-url');
            });

            it('should open lightbox with overridden image after replacement', () => {
                const modalService = spectator.inject(ModalService) as jest.Mocked<ModalService>;
                modalService.open.mockReturnValue(of({ title: 'Новое описание' }));
                const updatedPicture: Picture = {
                    ...mockPicture,
                    title: 'Новое описание',
                    imageUrl: '/images/0000/0042.jpg?v=12345',
                };
                const mockResult: PictureEditResult = { picture: updatedPicture, pending: undefined };
                pictureService.editPicture.mockReturnValue(of(mockResult));
                const lightbox = spectator.inject(PictureLightboxService);

                triggerFileSelect(spectator, createValidFile());
                spectator.detectChanges();

                spectator.component.onImageClick();
                expect(lightbox.openWithPicture).toHaveBeenCalledWith(
                    expect.objectContaining({
                        imageUrl: '/images/0000/0042.jpg?v=12345',
                        title: 'Новое описание',
                    }),
                );
            });
        });
        describe('deletion', () => {
            let confirmationService: jest.Mocked<ConfirmationService>;
            let notification: jest.Mocked<NotificationService>;
            let routerNavigateSpy: jest.SpyInstance;

            beforeEach(() => {
                confirmationService = spectator.inject(ConfirmationService) as jest.Mocked<ConfirmationService>;
                notification = spectator.inject(NotificationService) as jest.Mocked<NotificationService>;
                routerNavigateSpy = jest.spyOn(spectator.inject(Router), 'navigate').mockResolvedValue(true);
            });

            it('should disable delete button when articles exist', () => {
                spectator.detectChanges();
                expect(spectator.component.canDelete()).toBe(false);
            });

            it('should enable delete button when no articles', () => {
                pictureService.getPictureArticles.mockReturnValue(of([]));
                spectator.detectChanges();
                expect(spectator.component.canDelete()).toBe(true);
            });

            it('should disable delete button when articles are still loading', () => {
                pictureService.getPictureArticles.mockReturnValue(EMPTY);
                spectator.detectChanges();
                expect(spectator.component.canDelete()).toBe(false);
            });

            it('should open confirmation dialog on delete', () => {
                pictureService.getPictureArticles.mockReturnValue(of([]));
                spectator.detectChanges();
                confirmationService.open.mockReturnValue(of('cancel'));

                spectator.component.deletePicture();

                expect(confirmationService.open).toHaveBeenCalledWith(
                    expect.objectContaining({
                        title: 'Удаление иллюстрации',
                        message: 'Вы уверены, что хотите удалить эту иллюстрацию?',
                        disableClose: true,
                    }),
                );
            });

            it('should not call API when confirmation cancelled', () => {
                pictureService.getPictureArticles.mockReturnValue(of([]));
                spectator.detectChanges();
                confirmationService.open.mockReturnValue(of('cancel'));

                spectator.component.deletePicture();

                expect(pictureService.deletePicture).not.toHaveBeenCalled();
            });

            it('should redirect and show success on moderator delete', () => {
                pictureService.getPictureArticles.mockReturnValue(of([]));
                spectator.detectChanges();
                confirmationService.open.mockReturnValue(of('confirm'));
                const mockResult: PictureEditResult = {
                    picture: mockPicture,
                    pending: undefined,
                };
                pictureService.deletePicture.mockReturnValue(of(mockResult));

                spectator.component.deletePicture();

                expect(pictureService.deletePicture).toHaveBeenCalledWith(42);
                expect(notification.success).toHaveBeenCalledWith('Иллюстрация удалена');
                expect(routerNavigateSpy).toHaveBeenCalledWith(['/pictures']);
            });

            it('should show pending notification without redirect for regular user', () => {
                pictureService.getPictureArticles.mockReturnValue(of([]));
                spectator.detectChanges();
                confirmationService.open.mockReturnValue(of('confirm'));
                const mockResult: PictureEditResult = {
                    picture: undefined,
                    pending: createPending({
                        pendingType: 'delete',
                        title: undefined,
                        user: 'editor',
                    }),
                };
                pictureService.deletePicture.mockReturnValue(of(mockResult));

                spectator.component.deletePicture();

                expect(notification.info).toHaveBeenCalledWith('Запрос на удаление отправлен на модерацию');
                expect(routerNavigateSpy).not.toHaveBeenCalled();
                expect(pictureService.getPicturePending).toHaveBeenCalledTimes(2);
            });

            it('should show custom error on 409 conflict', () => {
                pictureService.getPictureArticles.mockReturnValue(of([]));
                spectator.detectChanges();
                confirmationService.open.mockReturnValue(of('confirm'));
                pictureService.deletePicture.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));

                spectator.component.deletePicture();

                expect(notification.error).toHaveBeenCalledWith(
                    'Иллюстрация используется в статьях и не может быть удалена',
                );
            });

            it('should show generic error on other failures', () => {
                pictureService.getPictureArticles.mockReturnValue(of([]));
                spectator.detectChanges();
                confirmationService.open.mockReturnValue(of('confirm'));
                pictureService.deletePicture.mockReturnValue(throwError(() => new Error('Server error')));

                spectator.component.deletePicture();

                expect(notification.error).toHaveBeenCalledWith('Не удалось удалить иллюстрацию');
            });

            it('should reset isDeleting after completion', () => {
                pictureService.getPictureArticles.mockReturnValue(of([]));
                spectator.detectChanges();
                confirmationService.open.mockReturnValue(of('confirm'));
                const mockResult: PictureEditResult = { picture: mockPicture, pending: undefined };
                pictureService.deletePicture.mockReturnValue(of(mockResult));

                expect(spectator.component.isDeleting()).toBe(false);
                spectator.component.deletePicture();
                expect(spectator.component.isDeleting()).toBe(false);
            });

            it('should reset isDeleting after error', () => {
                pictureService.getPictureArticles.mockReturnValue(of([]));
                spectator.detectChanges();
                confirmationService.open.mockReturnValue(of('confirm'));
                pictureService.deletePicture.mockReturnValue(throwError(() => new Error('fail')));

                spectator.component.deletePicture();
                expect(spectator.component.isDeleting()).toBe(false);
            });
        });
    });

    describe('without edit permission', () => {
        const createComponent = createComponentFactory({
            component: PictureDetailComponent,
            providers: [
                mockLoggerProvider(),
                mockProvider(PictureLightboxService),
                mockProvider(PictureService, {
                    getPictureArticles: jest.fn().mockReturnValue(of(mockArticles)),
                    getPicturePending: jest.fn().mockReturnValue(of([])),
                }),
                mockProvider(ModalService),
                mockProvider(ConfirmationService),
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
                mockProvider(PictureService, {
                    getPictureArticles: jest.fn().mockReturnValue(EMPTY),
                    getPicturePending: jest.fn().mockReturnValue(of([])),
                }),
                mockProvider(ModalService),
                mockProvider(ConfirmationService),
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

    describe('with moderator user', () => {
        const moderatorUser: User = {
            id: 3,
            login: 'moderator',
            name: 'Moderator',
            email: 'moderator@test.com',
            role: 'moder',
            permissions: { canEdit: true, canModerate: true, canAdmin: false },
        };

        const createComponent = createComponentFactory({
            component: PictureDetailComponent,
            providers: [
                mockLoggerProvider(),
                mockProvider(PictureLightboxService),
                mockProvider(PictureService, {
                    getPictureArticles: jest.fn().mockReturnValue(of(mockArticles)),
                    getPicturePending: jest.fn().mockReturnValue(of([createPending({ user: 'Другой пользователь' })])),
                    approvePending: jest.fn().mockReturnValue(of(undefined)),
                    rejectPending: jest.fn().mockReturnValue(of(undefined)),
                }),
                mockProvider(ModalService),
                mockProvider(ConfirmationService),
                mockProvider(NotificationService),
                {
                    provide: AuthService,
                    useValue: { user$: of(moderatorUser) },
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
        });

        it('should show approve and reject buttons for foreign pending', () => {
            spectator.detectChanges();

            expect(spectator.query('[data-testid="pending-banner-approve"]')).toBeTruthy();
            expect(spectator.query('[data-testid="pending-banner-reject"]')).toBeTruthy();
            expect(spectator.query('[data-testid="pending-banner-author"]')).toBeTruthy();
        });

        it('should approve pending and refresh list', () => {
            const notification = spectator.inject(NotificationService);

            spectator.detectChanges();
            spectator.click('[data-testid="pending-banner-approve"]');

            expect(pictureService.approvePending).toHaveBeenCalledWith(1);
            expect(notification.success).toHaveBeenCalledWith('Изменение одобрено');
            expect(pictureService.getPicturePending).toHaveBeenCalledTimes(2);
        });

        it('should reject pending and refresh list', () => {
            const notification = spectator.inject(NotificationService);

            spectator.detectChanges();
            spectator.click('[data-testid="pending-banner-reject"]');

            expect(pictureService.rejectPending).toHaveBeenCalledWith(1);
            expect(notification.success).toHaveBeenCalledWith('Изменение отклонено');
            expect(pictureService.getPicturePending).toHaveBeenCalledTimes(2);
        });
    });

    describe('with load-error result', () => {
        const createComponent = createComponentFactory({
            component: PictureDetailComponent,
            providers: [
                mockLoggerProvider(),
                mockProvider(PictureLightboxService),
                mockProvider(PictureService, {
                    getPictureArticles: jest.fn().mockReturnValue(EMPTY),
                    getPicturePending: jest.fn().mockReturnValue(of([])),
                }),
                mockProvider(ModalService),
                mockProvider(ConfirmationService),
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
