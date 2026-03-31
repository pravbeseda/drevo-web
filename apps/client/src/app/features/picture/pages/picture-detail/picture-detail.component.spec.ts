import { PictureLightboxService } from '../../../../services/pictures/picture-lightbox.service';
import { PictureService } from '../../../../services/pictures/picture.service';
import { PictureDetailComponent } from './picture-detail.component';
import { PLATFORM_ID } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { NotificationService, WINDOW } from '@drevo-web/core';
import { Picture, PictureArticle } from '@drevo-web/shared';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { of, EMPTY } from 'rxjs';

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

const mockWriteText = jest.fn().mockResolvedValue(undefined);
const mockWindow = {
    navigator: { clipboard: { writeText: mockWriteText } },
} as unknown as Window;

describe('PictureDetailComponent', () => {
    let spectator: Spectator<PictureDetailComponent>;
    let pictureService: jest.Mocked<PictureService>;

    describe('with picture data', () => {
        const createComponent = createComponentFactory({
            component: PictureDetailComponent,
            providers: [
                mockLoggerProvider(),
                mockProvider(PictureLightboxService),
                mockProvider(PictureService, { getPictureArticles: jest.fn().mockReturnValue(of(mockArticles)) }),
                mockProvider(NotificationService),
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
            expect(empty?.textContent?.trim()).toBe('Не используется в статьях');
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
