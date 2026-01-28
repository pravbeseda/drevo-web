import { appRoutes } from './app.routes';
import { environment } from '../environments/environment';
import { authInterceptorProvider } from './interceptors/auth.interceptor';
import {
    provideHttpClient,
    withFetch,
    withInterceptorsFromDi,
} from '@angular/common/http';
import {
    ApplicationConfig,
    importProvidersFrom,
    provideZonelessChangeDetection,
} from '@angular/core';
import {
    provideClientHydration,
    withEventReplay,
} from '@angular/platform-browser';
import {
    provideRouter,
    RouterModule,
    withComponentInputBinding,
} from '@angular/router';
import {
    errorNotificationInterceptorProvider,
    provideLogProductionMode,
    provideLogProviders,
    createIndexedDBLogProvider,
    createSentryLogProvider,
} from '@drevo-web/core';

const routesTracing = false;

// Build log providers array based on environment
const logProviders = [
    createIndexedDBLogProvider(),
    // Add Sentry provider only when DSN is configured
    ...(environment.sentryDsn
        ? [createSentryLogProvider(environment.production, true)]
        : []),
];

export const appConfig: ApplicationConfig = {
    providers: [
        provideClientHydration(withEventReplay()),
        provideZonelessChangeDetection(),
        provideRouter(appRoutes, withComponentInputBinding()),
        provideHttpClient(withFetch(), withInterceptorsFromDi()),
        authInterceptorProvider,
        errorNotificationInterceptorProvider,
        importProvidersFrom(
            RouterModule.forRoot(appRoutes, { enableTracing: routesTracing })
        ),
        // Logging configuration
        provideLogProductionMode(environment.production),
        provideLogProviders(logProviders),
    ],
};
