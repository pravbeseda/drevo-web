import { provideRouter } from '@angular/router';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { IconComponent } from '../icon/icon.component';
import { TabGroup, TabsGroupComponent } from './tabs-group.component';

const TEST_GROUPS: TabGroup[] = [
    {
        items: [
            {
                label: 'Статья',
                route: '/articles/1',
                icon: 'article',
                exactRouteMatch: true,
            },
            { label: 'Новости', route: '/articles/1/news', icon: 'newspaper' },
            { label: 'Обсуждение', route: '/articles/1/forum', icon: 'forum' },
        ],
    },
    {
        items: [
            {
                label: 'Версии',
                route: '/articles/1/history',
                icon: 'history',
                badge: 5,
            },
            {
                label: 'Кто ссылается',
                route: '/articles/1/linkedhere',
                icon: 'link',
            },
        ],
        align: 'end',
    },
];

describe('TabsGroupComponent', () => {
    let spectator: Spectator<TabsGroupComponent>;
    const createComponent = createComponentFactory({
        component: TabsGroupComponent,
        providers: [provideRouter([{ path: '**', children: [] }])],
    });

    beforeEach(() => {
        spectator = createComponent({
            props: { groups: TEST_GROUPS },
        });
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should render two nav groups', () => {
        const navs = spectator.queryAll('nav.tab-group');
        expect(navs).toHaveLength(2);
    });

    it('should render all tab links', () => {
        const links = spectator.queryAll('.tab-link');
        expect(links).toHaveLength(5);
    });

    it('should display tab labels', () => {
        const labels = spectator.queryAll('.tab-label');
        expect(labels[0]).toHaveText('Статья');
        expect(labels[1]).toHaveText('Новости');
        expect(labels[2]).toHaveText('Обсуждение');
        expect(labels[3]).toHaveText('Версии');
        expect(labels[4]).toHaveText('Кто ссылается');
    });

    it('should show badge when badge value is provided', () => {
        const badge = spectator.query('ui-badge');
        expect(badge).toBeTruthy();
        expect(badge).toHaveText('5');
    });

    it('should not show badge when badge is undefined', () => {
        spectator.setInput('groups', [
            {
                items: [{ label: 'No Badge', route: '/test', icon: 'article' }],
            },
        ]);
        const badge = spectator.query('ui-badge');
        expect(badge).toBeFalsy();
    });

    it('should apply end alignment class to second group', () => {
        const navs = spectator.queryAll('nav.tab-group');
        expect(navs[0]).not.toHaveClass('tab-group--end');
        expect(navs[1]).toHaveClass('tab-group--end');
    });

    it('should render content area', () => {
        const content = spectator.query('.tabs-group-content');
        expect(content).toBeTruthy();
    });

    it('should render icons with tab labels as tooltips', () => {
        const icons = spectator.queryAll(IconComponent);
        expect(icons).toHaveLength(5);
        expect(icons[0].tooltip()).toBe('Статья');
        expect(icons[1].tooltip()).toBe('Новости');
        expect(icons[2].tooltip()).toBe('Обсуждение');
        expect(icons[3].tooltip()).toBe('Версии');
        expect(icons[4].tooltip()).toBe('Кто ссылается');
    });

    it('should render data-testid when testId is provided', () => {
        spectator.setInput('groups', [
            {
                items: [
                    { label: 'Tab', route: '/test', icon: 'article', testId: 'my-tab' },
                ],
            },
        ]);
        const link = spectator.query('.tab-link');
        expect(link).toHaveAttribute('data-testid', 'my-tab');
    });

    it('should not render data-testid when testId is not provided', () => {
        const link = spectator.query('.tab-link');
        expect(link).not.toHaveAttribute('data-testid');
    });
});
