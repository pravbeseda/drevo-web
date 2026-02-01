import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { MockProvider } from 'ng-mocks';
import { DrawerService } from '@drevo-web/core';
import { SidebarNavComponent } from './sidebar-nav.component';

describe('SidebarNavComponent', () => {
    let spectator: Spectator<SidebarNavComponent>;
    const createComponent = createComponentFactory({
        component: SidebarNavComponent,
        providers: [
            provideRouter([]),
            MockProvider(DrawerService, {
                isOpen: signal(true),
            }),
        ],
    });

    it('should create', () => {
        spectator = createComponent();

        expect(spectator.component).toBeTruthy();
    });

    it('should render nav items with links', () => {
        spectator = createComponent();

        const items = spectator.queryAll('.nav-item');

        expect(items.length).toBeGreaterThan(0);
        expect(items[0]).toHaveAttribute('href', '/history/articles');
        expect(items[0]).toHaveText('Изменения');
    });

    it('should set title attribute on nav items', () => {
        spectator = createComponent();

        const item = spectator.query('.nav-item');

        expect(item).toHaveAttribute('title', 'Изменения');
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
});
