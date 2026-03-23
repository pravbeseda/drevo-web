import { PictureLightboxService } from '../../services/pictures/picture-lightbox.service';
import { PictureLightboxComponent } from './picture-lightbox.component';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { Picture } from '@drevo-web/shared';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';

describe('PictureLightboxComponent', () => {
    let spectator: Spectator<PictureLightboxComponent>;
    let router: jest.Mocked<Router>;

    const mockPicture: Picture = {
        id: 123,
        folder: '004',
        title: 'Храм Христа Спасителя',
        user: 'Иван',
        date: new Date('2025-03-10'),
        width: 800,
        height: 600,
        imageUrl: '/images/004/000123.jpg',
        thumbnailUrl: '/pictures/thumbs/004/000123.jpg',
    };

    const isOpen = signal(false);
    const isLoading = signal(false);
    const isZoomed = signal(false);
    const currentPicture = signal<Picture | undefined>(undefined);

    const mockLightboxService = {
        isOpen: isOpen.asReadonly(),
        isLoading: isLoading.asReadonly(),
        isZoomed: isZoomed.asReadonly(),
        currentPicture: currentPicture.asReadonly(),
        close: jest.fn(),
        toggleZoom: jest.fn(),
    };

    const createComponent = createComponentFactory({
        component: PictureLightboxComponent,
        providers: [
            { provide: PictureLightboxService, useValue: mockLightboxService },
            mockProvider(Router),
            mockLoggerProvider(),
        ],
        detectChanges: false,
    });

    beforeEach(() => {
        jest.clearAllMocks();
        isOpen.set(false);
        isLoading.set(false);
        isZoomed.set(false);
        currentPicture.set(undefined);
        spectator = createComponent();
        router = spectator.inject(Router) as jest.Mocked<Router>;
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should not render when closed', () => {
        spectator.detectChanges();
        expect(spectator.query('[data-testid="lightbox-backdrop"]')).toBeFalsy();
    });

    it('should render backdrop when open', () => {
        isOpen.set(true);
        isLoading.set(true);
        spectator.detectChanges();
        expect(spectator.query('[data-testid="lightbox-backdrop"]')).toBeTruthy();
    });

    it('should show spinner when loading', () => {
        isOpen.set(true);
        isLoading.set(true);
        spectator.detectChanges();
        expect(spectator.query('ui-spinner')).toBeTruthy();
    });

    it('should show image when loaded', () => {
        isOpen.set(true);
        currentPicture.set(mockPicture);
        spectator.detectChanges();

        const img = spectator.query('[data-testid="lightbox-image"]') as HTMLImageElement;
        expect(img).toBeTruthy();
        expect(img.src).toContain('/images/004/000123.jpg');
        expect(img.alt).toBe('Храм Христа Спасителя');
    });

    it('should show title and detail link', () => {
        isOpen.set(true);
        currentPicture.set(mockPicture);
        spectator.detectChanges();

        const footer = spectator.query('[data-testid="lightbox-footer"]');
        expect(footer).toBeTruthy();
        expect(footer?.textContent).toContain('Храм Христа Спасителя');

        const detailLink = spectator.query('[data-testid="lightbox-detail-link"]');
        expect(detailLink).toBeTruthy();
    });

    it('should close on Escape key', () => {
        isOpen.set(true);
        currentPicture.set(mockPicture);
        spectator.detectChanges();

        spectator.component.onEscape();

        expect(mockLightboxService.close).toHaveBeenCalled();
    });

    it('should close on backdrop click', () => {
        isOpen.set(true);
        currentPicture.set(mockPicture);
        spectator.detectChanges();

        const backdrop = spectator.query('[data-testid="lightbox-backdrop"]') as HTMLElement;
        backdrop.click();

        expect(mockLightboxService.close).toHaveBeenCalled();
    });

    it('should toggle zoom on image click', () => {
        isOpen.set(true);
        currentPicture.set(mockPicture);
        spectator.detectChanges();

        const img = spectator.query('[data-testid="lightbox-image"]') as HTMLImageElement;
        img.click();

        expect(mockLightboxService.toggleZoom).toHaveBeenCalled();
    });

    it('should navigate to detail page and close lightbox', () => {
        isOpen.set(true);
        currentPicture.set(mockPicture);
        spectator.detectChanges();

        spectator.component.openDetailPage();

        expect(mockLightboxService.close).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/pictures', 123]);
    });

    it('should apply zoomed class when zoomed', () => {
        isOpen.set(true);
        isZoomed.set(true);
        currentPicture.set(mockPicture);
        spectator.detectChanges();

        const content = spectator.query('.lightbox__content');
        expect(content?.classList.contains('lightbox__content--zoomed')).toBe(true);
    });
});
