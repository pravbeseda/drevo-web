import { provideRouter } from '@angular/router';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';
import { LogExportService } from '@drevo-web/core';
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

    it('should call logExportService.downloadLogs when downloadLogs is called', () => {
        spectator = createComponent();
        const logExportService = spectator.inject(LogExportService);
        jest.spyOn(logExportService, 'downloadLogs').mockResolvedValue();

        spectator.component.downloadLogs();

        expect(logExportService.downloadLogs).toHaveBeenCalled();
    });
});
