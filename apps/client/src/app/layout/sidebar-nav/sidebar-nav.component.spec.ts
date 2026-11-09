import { CountsService } from '../../services/counts/counts.service';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { MockProvider } from 'ng-mocks';
import { DrawerService } from '@drevo-web/core';
import { IconComponent } from '@drevo-web/ui/icon';
import { SidebarNavComponent } from './sidebar-nav.component';

describe('SidebarNavComponent', () => {
    let spectator: Spectator<SidebarNavComponent>;
    const createComponent = createComponentFactory({
        component: SidebarNavComponent,
        providers: [
            provideRouter([{ path: '**', children: [] }]),
            MockProvider(DrawerService, {
                isOpen: signal(true),
            }),
            MockProvider(CountsService, {
                pendingTotal: signal(0),
                forumUnread: signal(0),
            }),
        ],
    });

    it('should create', () => {
        spectator = createComponent();

        expect(spectator.component).toBeTruthy();
    });

    it('should render nav items with links', () => {
        spectator = createComponent();

        const items = spectator.queryAll('[data-testid="nav-item"]');

        expect(items.length).toBeGreaterThan(0);
        expect(items[0]).toHaveAttribute('href', '/');
        expect(items[0]).toHaveText('Главная');
        expect(items[1]).toHaveAttribute('href', '/history/articles');
        expect(items[1]).toHaveText('Изменения');
    });

    it('should not offer a news section: the news are in the history', () => {
        spectator = createComponent();

        const newsItem = spectator
            .queryAll('[data-testid="nav-item"]')
            .find(item => item.textContent?.includes('Новости'));

        expect(newsItem).toBeUndefined();
    });

    it('should link to the forum', () => {
        spectator = createComponent();

        const forumItem = spectator
            .queryAll('[data-testid="nav-item"]')
            .find(item => item.textContent?.includes('Форум'));

        expect(forumItem).toHaveAttribute('href', '/forum');
    });

    it('should pass label as tooltip to icon', () => {
        spectator = createComponent();

        const icon = spectator.query(IconComponent);

        expect(icon?.tooltip()).toBe('Главная');
    });

    describe('active item', () => {
        function activeLabels(): readonly string[] {
            return spectator
                .queryAll<HTMLElement>('[data-testid="nav-item"]')
                .filter(item => item.classList.contains('active'))
                .map(item => item.getAttribute('aria-label') ?? '');
        }

        async function openPage(url: string): Promise<void> {
            spectator = createComponent();
            await spectator.inject(Router).navigateByUrl(url);
            spectator.detectChanges();
        }

        it('should mark the home item on the home page', async () => {
            await openPage('/');

            expect(activeLabels()).toEqual(['Главная']);
        });

        it('should not mark the home item on another page', async () => {
            await openPage('/pictures');

            expect(activeLabels()).toEqual(['Иллюстрации']);
        });

        it('should keep marking a section on its nested page', async () => {
            await openPage('/forum/topic/1');

            expect(activeLabels()).toEqual(['Форум']);
        });
    });

    it('should not have compact class when drawer is open', () => {
        spectator = createComponent();

        expect(spectator.element).not.toHaveClass('compact');
    });

    it('should have compact class when drawer is closed', () => {
        spectator = createComponent({
            providers: [
                MockProvider(DrawerService, {
                    isOpen: signal(false),
                }),
            ],
        });

        expect(spectator.element).toHaveClass('compact');
    });

    describe('badges', () => {
        const pendingTotal = signal(0);
        const forumUnread = signal(0);

        function navItem(label: string): HTMLElement {
            const item = spectator.queryAll<HTMLElement>('[data-testid="nav-item"]').find(element => {
                return element.textContent?.includes(label);
            });
            if (!item) throw new Error(`No nav item ${label}`);
            return item;
        }

        function badgeOf(label: string): Element | null {
            return navItem(label).querySelector('[data-testid="nav-badge"]');
        }

        beforeEach(() => {
            pendingTotal.set(0);
            forumUnread.set(0);
            spectator = createComponent({
                providers: [MockProvider(CountsService, { pendingTotal, forumUnread })],
            });
        });

        it('should show the pending total on the history item', () => {
            pendingTotal.set(12);
            spectator.detectChanges();

            expect(badgeOf('Изменения')).toHaveText('12');
        });

        it('should show the unread messages on the forum item', () => {
            forumUnread.set(5);
            spectator.detectChanges();

            expect(badgeOf('Форум')).toHaveText('5');
        });

        it('should show no badge at zero', () => {
            expect(spectator.query('[data-testid="nav-badge"]')).toBeNull();
        });

        it('should keep the other items without a badge', () => {
            pendingTotal.set(12);
            forumUnread.set(5);
            spectator.detectChanges();

            expect(badgeOf('Иллюстрации')).toBeNull();
            expect(badgeOf('Календарь')).toBeNull();
        });

        it('should show the largest count in full', () => {
            forumUnread.set(99);
            spectator.detectChanges();

            expect(badgeOf('Форум')?.textContent?.trim()).toBe('99');
        });

        it('should cap a larger count', () => {
            forumUnread.set(100);
            spectator.detectChanges();

            expect(badgeOf('Форум')?.textContent?.trim()).toBe('99+');
        });

        it('should name the exact count to a screen reader, past the cap too', () => {
            forumUnread.set(120);
            pendingTotal.set(3);
            spectator.detectChanges();

            expect(navItem('Форум')).toHaveAttribute('aria-label', 'Форум: непрочитанных 120');
            expect(navItem('Изменения')).toHaveAttribute('aria-label', 'Изменения: на модерации 3');
        });

        it('should keep the plain name at zero', () => {
            expect(navItem('Форум')).toHaveAttribute('aria-label', 'Форум');
        });
    });
});
