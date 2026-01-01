import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { MockProvider } from 'ng-mocks';
import { provideRouter } from '@angular/router';
import { HeaderComponent } from './header.component';
import { ModalService } from '@drevo-web/ui';
import { AuthService } from '../../services/auth/auth.service';
import { of } from 'rxjs';

describe('HeaderComponent', () => {
    let spectator: Spectator<HeaderComponent>;
    const createComponent = createComponentFactory({
        component: HeaderComponent,
        providers: [
            provideRouter([]),
            MockProvider(ModalService),
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
});
