import { PicturesHistoryService } from '../../services/pictures-history.service';
import { PicturesHistoryComponent } from './pictures-history.component';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { Router } from '@angular/router';

describe('PicturesHistoryComponent', () => {
    let spectator: Spectator<PicturesHistoryComponent>;

    const mockService = {
        init: jest.fn(),
        isInitialLoading: signal(false),
        hasRecentError: signal(false),
        hasPendingError: signal(false),
        hasPendingItems: signal(false),
        hasItems: signal(false),
        isRecentLoadingMore: signal(false),
        displayItems: signal([]),
        displayTotalItems: signal(0),
        onLoadMore: jest.fn(),
    };

    const createComponent = createComponentFactory({
        component: PicturesHistoryComponent,
        componentProviders: [
            {
                provide: PicturesHistoryService,
                useValue: mockService,
            },
        ],
        detectChanges: false,
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockService.isInitialLoading.set(false);
        mockService.hasRecentError.set(false);
        mockService.hasPendingError.set(false);
        mockService.hasPendingItems.set(false);
        mockService.hasItems.set(false);
        mockService.isRecentLoadingMore.set(false);
        mockService.displayItems.set([]);
        mockService.displayTotalItems.set(0);
        spectator = createComponent();
    });

    it('should create', () => {
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    it('should call service.init() on ngOnInit', () => {
        spectator.detectChanges();
        expect(mockService.init).toHaveBeenCalled();
    });

    it('should show loading spinner during initial load', () => {
        mockService.isInitialLoading.set(true);
        spectator.detectChanges();
        expect(spectator.query('ui-spinner')).toBeTruthy();
    });

    it('should show empty message when no items', () => {
        spectator.detectChanges();
        expect(spectator.query('[data-testid="recent-empty"]')?.textContent?.trim()).toBe('Нет иллюстраций');
    });

    it('should show error message on recent load failure', () => {
        mockService.hasRecentError.set(true);
        spectator.detectChanges();
        expect(spectator.query('[data-testid="recent-error"]')?.textContent?.trim()).toBe(
            'Не удалось загрузить данные',
        );
    });

    it('should show virtual scroller when items exist', () => {
        mockService.hasItems.set(true);
        mockService.displayItems.set([{ type: 'header', date: 'Сегодня' }]);
        mockService.displayTotalItems.set(1);
        spectator.detectChanges();
        expect(spectator.query('[data-testid="pictures-list"]')).toBeTruthy();
    });

    it('should show items with inline error when recent fails but pending loaded', () => {
        mockService.hasItems.set(true);
        mockService.hasRecentError.set(true);
        mockService.displayItems.set([{ type: 'pending', data: { pictureId: 1, currentTitle: '', currentThumbnailUrl: '', items: [] } }]);
        mockService.displayTotalItems.set(1);
        spectator.detectChanges();

        expect(spectator.query('[data-testid="pictures-list"]')).toBeTruthy();
        expect(spectator.query('[data-testid="recent-error"]')).toBeTruthy();
    });

    it('should show pending error when pending fails and no pending items', () => {
        mockService.hasItems.set(true);
        mockService.hasPendingError.set(true);
        mockService.displayItems.set([{ type: 'header', date: 'Сегодня' }]);
        mockService.displayTotalItems.set(1);
        spectator.detectChanges();

        expect(spectator.query('[data-testid="pending-error"]')?.textContent?.trim()).toBe(
            'Не удалось загрузить ожидающие модерации',
        );
    });

    it('should not show pending error when pending items exist', () => {
        mockService.hasItems.set(true);
        mockService.hasPendingError.set(true);
        mockService.hasPendingItems.set(true);
        mockService.displayItems.set([{ type: 'pending', data: { pictureId: 1, currentTitle: '', currentThumbnailUrl: '', items: [] } }]);
        mockService.displayTotalItems.set(1);
        spectator.detectChanges();

        expect(spectator.query('[data-testid="pending-error"]')).toBeNull();
    });

    it('should show error when both pending and recent fail and no items', () => {
        mockService.hasPendingError.set(true);
        mockService.hasRecentError.set(true);
        spectator.detectChanges();

        expect(spectator.query('[data-testid="recent-error"]')).toBeTruthy();
    });

    it('should navigate to picture detail on pictureClick', () => {
        spectator.detectChanges();
        const router = spectator.inject(Router);
        jest.spyOn(router, 'navigate').mockReturnValue(Promise.resolve(true));

        spectator.component.onPictureClick(42);

        expect(router.navigate).toHaveBeenCalledWith(['/pictures', 42]);
    });
});
