import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { MockProvider } from 'ng-mocks';
import { DrawerService } from '@drevo-web/core';
import { LayoutComponent } from './layout.component';

describe('LayoutComponent', () => {
    let spectator: Spectator<LayoutComponent>;
    const createComponent = createComponentFactory({
        component: LayoutComponent,
        providers: [
            provideHttpClient(),
            provideHttpClientTesting(),
            provideRouter([]),
            MockProvider(DrawerService, {
                isOpen: signal(true),
                close: jest.fn(),
            }),
        ],
    });

    it('should create', () => {
        spectator = createComponent();

        expect(spectator.component).toBeTruthy();
    });

    it('should apply sidebar-collapsed class when drawer is closed', () => {
        spectator = createComponent({
            providers: [
                MockProvider(DrawerService, {
                    isOpen: signal(false),
                    close: jest.fn(),
                }),
            ],
        });

        const layout = spectator.query('.layout');
        expect(layout).toHaveClass('sidebar-collapsed');
    });

    it('should not apply sidebar-collapsed class when drawer is open', () => {
        spectator = createComponent();

        const layout = spectator.query('.layout');
        expect(layout).not.toHaveClass('sidebar-collapsed');
    });

    it('should call drawerService.close when closeDrawer is called', () => {
        spectator = createComponent();
        const drawerService = spectator.inject(DrawerService);

        spectator.component.closeDrawer();

        expect(drawerService.close).toHaveBeenCalled();
    });
});
