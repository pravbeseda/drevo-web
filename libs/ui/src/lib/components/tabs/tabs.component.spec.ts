import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { TabItem, TabsComponent } from './tabs.component';

const TEST_TABS: TabItem[] = [
    { label: 'Tab 1', route: '/tab1' },
    { label: 'Tab 2', route: '/tab2', badge: 5 },
    { label: 'Tab 3', route: '/tab3' },
];

describe('TabsComponent', () => {
    let spectator: Spectator<TabsComponent>;
    const createComponent = createComponentFactory({
        component: TabsComponent,
        imports: [NoopAnimationsModule],
        providers: [provideRouter([{ path: '**', children: [] }])],
    });

    beforeEach(() => {
        spectator = createComponent({
            props: { tabs: TEST_TABS },
        });
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should render all tab links', () => {
        const links = spectator.queryAll('a[mat-tab-link]');
        expect(links).toHaveLength(3);
    });

    it('should display tab labels', () => {
        const links = spectator.queryAll('a[mat-tab-link]');
        expect(links[0]).toHaveText('Tab 1');
        expect(links[1].textContent).toContain('Tab 2');
        expect(links[2]).toHaveText('Tab 3');
    });

    it('should show badge when badge value is provided', () => {
        const badge = spectator.query('ui-badge');
        expect(badge).toBeTruthy();
        expect(badge).toHaveText('5');
    });

    it('should not show badge when badge is undefined', () => {
        spectator.setInput('tabs', [{ label: 'No Badge', route: '/no-badge' }]);
        const badge = spectator.query('ui-badge');
        expect(badge).toBeFalsy();
    });

    it('should show badge with zero value', () => {
        spectator.setInput('tabs', [{ label: 'Zero', route: '/zero', badge: 0 }]);
        const badge = spectator.query('ui-badge');
        expect(badge).toBeTruthy();
        expect(badge).toHaveText('0');
    });

    it('should render nav element with mat-tab-nav-bar', () => {
        const nav = spectator.query('nav[mat-tab-nav-bar]');
        expect(nav).toBeTruthy();
    });

    it('should render mat-tab-nav-panel', () => {
        const panel = spectator.query('mat-tab-nav-panel');
        expect(panel).toBeTruthy();
    });
});
