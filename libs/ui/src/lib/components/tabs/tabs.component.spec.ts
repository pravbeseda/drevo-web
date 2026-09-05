import { provideRouter, Router, RouterLinkActive } from '@angular/router';
import { MatTooltip } from '@angular/material/tooltip';
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

    it('should render data-testid when testId is provided', () => {
        spectator.setInput('tabs', [{ label: 'With ID', route: '/with-id', testId: 'my-tab' }]);
        const link = spectator.query('[data-testid="my-tab"]');
        expect(link).toBeTruthy();
    });

    it('should not render data-testid when testId is not provided', () => {
        const links = spectator.queryAll('a[mat-tab-link]');
        links.forEach(link => {
            expect(link.getAttribute('data-testid')).toBeNull();
        });
    });

    it('should set the tooltip when the tab carries one', () => {
        spectator.setInput('tabs', [{ label: 'Hinted', route: '/hinted', tooltip: 'What this tab holds' }]);

        const tooltip = spectator.query('a[mat-tab-link]', { read: MatTooltip });

        expect(tooltip?.message).toBe('What this tab holds');
    });

    it('should leave the tooltip empty when the tab carries none', () => {
        const tooltip = spectator.query('a[mat-tab-link]', { read: MatTooltip });

        expect(tooltip?.message).toBeFalsy();
    });

    describe('a tab whose route is the prefix of another', () => {
        const NESTED_TABS: TabItem[] = [
            { label: 'All', route: '/forum', exact: true },
            { label: 'Common', route: '/forum/common' },
        ];

        const activeStates = (): boolean[] =>
            spectator.queryAll('a[mat-tab-link]', { read: RouterLinkActive }).map(link => link.isActive);

        beforeEach(() => {
            spectator.setInput('tabs', NESTED_TABS);
        });

        it('should mark only the nested tab active on the nested route', async () => {
            await spectator.inject(Router).navigate(['/forum/common']);
            spectator.detectChanges();

            expect(activeStates()).toEqual([false, true]);
        });

        it('should mark the exact tab active on its own route', async () => {
            await spectator.inject(Router).navigate(['/forum']);
            spectator.detectChanges();

            expect(activeStates()).toEqual([true, false]);
        });

        it('should keep the exact tab active when its route carries a query string', async () => {
            await spectator.inject(Router).navigate(['/forum'], { queryParams: { page: 2 } });
            spectator.detectChanges();

            expect(activeStates()).toEqual([true, false]);
        });
    });
});
