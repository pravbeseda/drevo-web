import { AuthService } from '../../../../services/auth/auth.service';
import { HistoryCounts, HistoryCountsService } from '../../../../services/counts/history-counts.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { User } from '@drevo-web/shared';
import { BehaviorSubject } from 'rxjs';
import { HistoryComponent } from './history.component';

const EXPECTED_TABS = [
    { label: 'Статьи', route: '/history/articles', testId: 'history-tab-articles' },
    { label: 'Новости', route: '/history/news', testId: 'history-tab-news' },
    { label: 'Сообщения', route: '/history/forum', testId: 'history-tab-forum' },
    { label: 'Иллюстрации', route: '/history/pictures', testId: 'history-tab-pictures' },
];

const moderatorUser: User = {
    id: 1,
    login: 'moderator',
    name: 'Moderator',
    email: 'moderator@example.com',
    role: 'moder',
    permissions: { canEdit: true, canModerate: true, canAdmin: false },
};

const regularUser: User = {
    id: 2,
    login: 'user',
    name: 'User',
    email: 'user@example.com',
    role: 'user',
    permissions: { canEdit: true, canModerate: false, canAdmin: false },
};

describe('HistoryComponent', () => {
    let spectator: Spectator<HistoryComponent>;
    const userSubject = new BehaviorSubject<User | undefined>(undefined);
    const countsSignal = signal<HistoryCounts | undefined>(undefined);
    const mockHistoryCountsService = {
        counts: countsSignal.asReadonly(),
        loadCounts: jest.fn(),
    };
    const mockAuthService = {
        user$: userSubject.asObservable(),
    };

    const createComponent = createComponentFactory({
        component: HistoryComponent,
        imports: [NoopAnimationsModule],
        providers: [
            provideRouter([{ path: '**', children: [] }]),
            { provide: AuthService, useValue: mockAuthService },
            { provide: HistoryCountsService, useValue: mockHistoryCountsService },
        ],
    });

    beforeEach(() => {
        userSubject.next(undefined);
        countsSignal.set(undefined);
        mockHistoryCountsService.loadCounts.mockClear();
        spectator = createComponent();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should not call loadCounts for guests', () => {
        expect(mockHistoryCountsService.loadCounts).not.toHaveBeenCalled();
    });

    it('should call loadCounts for moderators', () => {
        userSubject.next(moderatorUser);
        spectator.detectChanges();

        expect(mockHistoryCountsService.loadCounts).toHaveBeenCalledTimes(1);
    });

    it('should have 4 tabs without badges when counts not loaded', () => {
        expect(spectator.component.tabs()).toEqual(EXPECTED_TABS);
    });

    it('should show badges for moderators when counts are loaded', () => {
        userSubject.next(moderatorUser);
        countsSignal.set({ pendingArticles: 5, pendingNews: 2, pendingPictures: 0 });

        const tabs = spectator.component.tabs();
        expect(tabs[0]).toEqual({ ...EXPECTED_TABS[0], badge: 5 });
        expect(tabs[1]).toEqual({ ...EXPECTED_TABS[1], badge: 2 });
        expect(tabs[2]).toEqual(EXPECTED_TABS[2]);
        expect(tabs[3]).toEqual(EXPECTED_TABS[3]);
    });

    it('should not show badges for regular users when counts are loaded', () => {
        userSubject.next(regularUser);
        countsSignal.set({ pendingArticles: 5, pendingNews: 2, pendingPictures: 3 });

        expect(spectator.component.tabs()).toEqual(EXPECTED_TABS);
    });

    it('should not show badge when count is zero', () => {
        userSubject.next(moderatorUser);
        countsSignal.set({ pendingArticles: 0, pendingNews: 0, pendingPictures: 0 });

        expect(spectator.component.tabs()).toEqual(EXPECTED_TABS);
    });

    it('should render ui-tabs', () => {
        expect(spectator.query('ui-tabs')).toBeTruthy();
    });

    it('should render router-outlet', () => {
        expect(spectator.query('router-outlet')).toBeTruthy();
    });
});
