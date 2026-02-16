import { appRoutes } from './app.routes';
import { authInterceptorProvider } from './interceptors/auth.interceptor';
import { PageTitleStrategy } from './services/page-title.strategy';
import { environment } from '../environments/environment';
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, TitleStrategy, withComponentInputBinding } from '@angular/router';
import {
    errorNotificationInterceptorProvider,
    provideLogProductionMode,
    provideLogProviders,
    createIndexedDBLogProvider,
    createSentryLogProvider,
} from '@drevo-web/core';

// Build log providers array based on environment
const logProviders = [
    createIndexedDBLogProvider(),
    // Add Sentry provider only when DSN is configured
    ...(environment.sentryDsn ? [createSentryLogProvider(environment.production, true)] : []),
];

export const appConfig: ApplicationConfig = {
    providers: [
        provideClientHydration(withEventReplay()),
        provideZonelessChangeDetection(),
        provideRouter(appRoutes, withComponentInputBinding()),
        provideHttpClient(withFetch(), withInterceptorsFromDi()),
        authInterceptorProvider,
        errorNotificationInterceptorProvider,
        PageTitleStrategy,
        { provide: TitleStrategy, useExisting: PageTitleStrategy },
        // Logging configuration
        provideLogProductionMode(environment.production),
        provideLogProviders(logProviders),
    ],
};
