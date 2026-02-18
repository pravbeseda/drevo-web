import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { HistoryComponent } from './history.component';

const EXPECTED_TABS = [
    { label: 'Статьи', route: '/history/articles' },
    { label: 'Новости', route: '/history/news' },
    { label: 'Сообщения', route: '/history/forum' },
    { label: 'Иллюстрации', route: '/history/pictures' },
];

describe('HistoryComponent', () => {
    let spectator: Spectator<HistoryComponent>;
    const createComponent = createComponentFactory({
        component: HistoryComponent,
        imports: [NoopAnimationsModule],
        providers: [provideRouter([{ path: '**', children: [] }])],
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should have 4 tabs', () => {
        expect(spectator.component.tabs).toHaveLength(4);
    });

    it('should define correct tab routes', () => {
        expect(spectator.component.tabs).toEqual(EXPECTED_TABS);
    });

    it('should render ui-tabs', () => {
        expect(spectator.query('ui-tabs')).toBeTruthy();
    });

    it('should render router-outlet', () => {
        expect(spectator.query('router-outlet')).toBeTruthy();
    });
});
