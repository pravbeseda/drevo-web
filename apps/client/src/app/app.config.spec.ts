import { appConfig } from './app.config';
import { AuthService } from './services/auth/auth.service';
import { CsrfService } from './services/auth/csrf.service';
import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Provider } from '@angular/core';
import { NotificationService } from '@drevo-web/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { createServiceFactory, mockProvider, SpectatorService } from '@ngneat/spectator/jest';
import { of } from 'rxjs';

jest.mock('../environments/environment', () => ({
    environment: { apiUrl: '', production: false },
}));

// The app's interceptors in the order appConfig registers them — that order is what is under test.
const appInterceptorProviders = (appConfig.providers as Provider[]).filter(
    provider => typeof provider === 'object' && 'provide' in provider && provider.provide === HTTP_INTERCEPTORS,
);

describe('appConfig HTTP interceptor chain', () => {
    let spectator: SpectatorService<HttpClient>;

    const createService = createServiceFactory({
        service: HttpClient,
        providers: [
            provideHttpClient(withInterceptorsFromDi()),
            provideHttpClientTesting(),
            ...appInterceptorProviders,
            mockLoggerProvider(),
            mockProvider(NotificationService),
            mockProvider(AuthService, { isAuthOperationInProgress$: of(false) }),
            mockProvider(CsrfService, {
                getCsrfToken: () => of('stale-token'),
                refreshCsrfToken: () => of('fresh-token'),
            }),
        ],
    });

    beforeEach(() => (spectator = createService()));

    afterEach(() => spectator.inject(HttpTestingController).verify());

    it('shows no error toast when a CSRF failure is recovered by the retry', () => {
        const http = spectator.inject(HttpTestingController);
        const onNext = jest.fn();

        spectator.service.post('/api/reviews', {}).subscribe(onNext);
        http.expectOne('/api/reviews').flush(
            { errorCode: 'CSRF_VALIDATION_FAILED' },
            { status: 403, statusText: 'Forbidden' },
        );
        http.expectOne('/api/reviews').flush({ success: true });

        expect(onNext).toHaveBeenCalled();
        expect(spectator.inject(NotificationService).error).not.toHaveBeenCalled();
    });

    it('still shows the error toast when the request fails for good', () => {
        const http = spectator.inject(HttpTestingController);

        spectator.service.post('/api/reviews', {}).subscribe({ error: () => undefined });
        http.expectOne('/api/reviews').flush({}, { status: 403, statusText: 'Forbidden' });

        expect(spectator.inject(NotificationService).error).toHaveBeenCalledWith('Доступ запрещен.');
    });
});
