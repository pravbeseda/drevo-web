import { PicturesHistoryService } from '../../services/pictures-history.service';
import { PicturesHistoryComponent } from './pictures-history.component';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { Router } from '@angular/router';

describe('PicturesHistoryComponent', () => {
    let spectator: Spectator<PicturesHistoryComponent>;

    const mockService = {
        init: jest.fn(),
        isPendingLoading: signal(false),
        hasPendingError: signal(false),
        hasPendingItems: signal(false),
        pendingGroups: signal([]),
        isRecentLoading: signal(false),
        isRecentLoadingMore: signal(false),
        hasRecentError: signal(false),
        hasRecentItems: signal(false),
        displayItems: signal([]),
        displayTotalItems: signal(0),
        hasMoreRecent: signal(false),
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

    it('should show pending section when pending items exist', () => {
        mockService.hasPendingItems.set(true);
        mockService.pendingGroups.set([
            {
                pictureId: 10,
                currentTitle: 'Test',
                currentThumbnailUrl: '/thumb.jpg',
                items: [],
            },
        ]);
        spectator.detectChanges();
        expect(spectator.query('[data-testid="pending-section"]')).toBeTruthy();
    });

    it('should hide pending section when no pending items', () => {
        mockService.hasPendingItems.set(false);
        spectator.detectChanges();
        expect(spectator.query('[data-testid="pending-section"]')).toBeFalsy();
    });

    it('should show recent section', () => {
        spectator.detectChanges();
        expect(spectator.query('[data-testid="recent-section"]')).toBeTruthy();
    });

    it('should show empty message when no recent items', () => {
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

    it('should navigate to picture detail on pictureClick', () => {
        spectator.detectChanges();
        const router = spectator.inject(Router);
        jest.spyOn(router, 'navigate').mockReturnValue(Promise.resolve(true));

        spectator.component.onPictureClick(42);

        expect(router.navigate).toHaveBeenCalledWith(['/pictures', 42]);
    });
});
