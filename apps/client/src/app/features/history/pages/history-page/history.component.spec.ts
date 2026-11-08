import { CountsService, HistoryCounts } from '../../../../services/counts/counts.service';
import { provideRouter } from '@angular/router';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { TabsComponent } from '@drevo-web/ui/tabs';
import { HistoryComponent } from './history.component';

const EXPECTED_TABS = [
    { label: 'Статьи', route: '/history/articles', testId: 'history-tab-articles' },
    { label: 'Новости', route: '/history/news', testId: 'history-tab-news' },
    { label: 'Иллюстрации', route: '/history/pictures', testId: 'history-tab-pictures' },
];

describe('HistoryComponent', () => {
    let spectator: Spectator<HistoryComponent>;
    const countsSignal = signal<HistoryCounts | undefined>(undefined);

    const createComponent = createComponentFactory({
        component: HistoryComponent,
        providers: [
            provideRouter([{ path: '**', children: [] }]),
            { provide: CountsService, useValue: { historyCounts: countsSignal.asReadonly() } },
        ],
    });

    beforeEach(() => {
        countsSignal.set(undefined);
        spectator = createComponent();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should have 3 tabs without badges when there are no counts', () => {
        expect(spectator.component.tabs()).toEqual(EXPECTED_TABS);
    });

    it('should show badges when counts are loaded', () => {
        countsSignal.set({ pendingArticles: 5, pendingNews: 2, pendingPictures: 0 });

        const tabs = spectator.component.tabs();
        expect(tabs[0]).toEqual({ ...EXPECTED_TABS[0], badge: 5 });
        expect(tabs[1]).toEqual({ ...EXPECTED_TABS[1], badge: 2 });
        expect(tabs[2]).toEqual(EXPECTED_TABS[2]);
    });

    it('should not show badge when count is zero', () => {
        countsSignal.set({ pendingArticles: 0, pendingNews: 0, pendingPictures: 0 });

        expect(spectator.component.tabs()).toEqual(EXPECTED_TABS);
    });

    it('should render ui-tabs', () => {
        expect(spectator.query('ui-tabs')).toBeTruthy();
    });

    it('should keep tabs at their content width', () => {
        expect(spectator.query(TabsComponent)?.stretch()).toBe(false);
    });

    it('should render router-outlet', () => {
        expect(spectator.query('router-outlet')).toBeTruthy();
    });
});
