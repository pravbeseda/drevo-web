import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';
import { DrawerService, LogExportService } from '@drevo-web/core';
import { ModalService } from '@drevo-web/ui';
import { AuthService } from '../../services/auth/auth.service';
import { PageTitleStrategy } from '../../services/page-title.strategy';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
    let spectator: Spectator<HeaderComponent>;
    const createComponent = createComponentFactory({
        component: HeaderComponent,
        providers: [
            provideRouter([]),
            MockProvider(ModalService),
            MockProvider(LogExportService),
            MockProvider(PageTitleStrategy, {
                pageTitle: signal('Древо'),
            }),
            MockProvider(DrawerService, {
                isOpen: signal(true),
                toggle: jest.fn(),
            }),
            MockProvider(AuthService, {
                user$: of(undefined),
                isLoading$: of(false),
            }),
        ],
    });

    it('should create', () => {
        spectator = createComponent();

        expect(spectator.component).toBeTruthy();
    });

    it('should call drawerService.toggle when toggleDrawer is called', () => {
        spectator = createComponent();
        const drawerService = spectator.inject(DrawerService);

        spectator.component.toggleDrawer();

        expect(drawerService.toggle).toHaveBeenCalled();
    });

    it('should display page title from PageTitleStrategy', () => {
        spectator = createComponent();

        expect(spectator.query('[data-testid="page-title"]')?.textContent?.trim()).toBe('Древо');
    });
});
