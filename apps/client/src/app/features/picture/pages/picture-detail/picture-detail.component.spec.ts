import { PictureLightboxService } from '../../../../services/pictures/picture-lightbox.service';
import { PictureDetailComponent } from './picture-detail.component';
import { PLATFORM_ID } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { NotificationService, WINDOW } from '@drevo-web/core';
import { Picture } from '@drevo-web/shared';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { of } from 'rxjs';

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

const mockWriteText = jest.fn().mockResolvedValue(undefined);
const mockWindow = {
    navigator: { clipboard: { writeText: mockWriteText } },
} as unknown as Window;

describe('PictureDetailComponent', () => {
    let spectator: Spectator<PictureDetailComponent>;

    describe('with picture data', () => {
        const createComponent = createComponentFactory({
            component: PictureDetailComponent,
            providers: [
                mockLoggerProvider(),
                mockProvider(PictureLightboxService),
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
        });

        it('should create', () => {
            expect(spectator.component).toBeTruthy();
        });

        it('should display picture title', () => {
            spectator.detectChanges();
            const title = spectator.query('[data-testid="detail-title"]');
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
            const author = spectator.query('.detail__author-name');
            expect(author?.textContent?.trim()).toBe('Иванов И.И.');
        });

        it('should display dimensions', () => {
            spectator.detectChanges();
            const dims = spectator.query('.detail__dimensions');
            expect(dims?.textContent?.trim()).toBe('1920 × 1280 px');
        });

        it('should open lightbox on image click', () => {
            spectator.detectChanges();
            const lightbox = spectator.inject(PictureLightboxService);
            spectator.click('[data-testid="detail-image"]');
            expect(lightbox.open).toHaveBeenCalledWith(42);
        });

        it('should copy insert code on button click', () => {
            spectator.detectChanges();
            spectator.click('[data-testid="copy-code"]');
            expect(mockWriteText).toHaveBeenCalledWith('@42@');
        });
    });

    describe('without picture data (404)', () => {
        const createComponent = createComponentFactory({
            component: PictureDetailComponent,
            providers: [
                mockLoggerProvider(),
                mockProvider(PictureLightboxService),
                mockProvider(NotificationService),
                {
                    provide: ActivatedRoute,
                    useValue: { data: of({ picture: undefined }) },
                },
                { provide: PLATFORM_ID, useValue: 'browser' },
                { provide: WINDOW, useValue: mockWindow },
            ],
            detectChanges: false,
        });

        beforeEach(() => {
            spectator = createComponent();
        });

        it('should show error component', () => {
            spectator.detectChanges();
            const error = spectator.query('[data-testid="detail-error"]');
            expect(error).toBeTruthy();
            expect(error?.textContent).toContain('Иллюстрация не найдена');
        });
    });
});
