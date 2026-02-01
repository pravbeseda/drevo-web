import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';
import { DrawerService, LogExportService } from '@drevo-web/core';
import { ModalService } from '@drevo-web/ui';
import { AuthService } from '../../services/auth/auth.service';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
    let spectator: Spectator<HeaderComponent>;
    const createComponent = createComponentFactory({
        component: HeaderComponent,
        providers: [
            provideRouter([]),
            MockProvider(ModalService),
            MockProvider(LogExportService),
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
});
