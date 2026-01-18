import {
    ApplicationConfig,
    ErrorHandler,
    importProvidersFrom,
    inject,
    provideAppInitializer,
    provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, Router, RouterModule } from '@angular/router';
import { appRoutes } from './app.routes';
import {
    provideClientHydration,
    withEventReplay,
} from '@angular/platform-browser';
import {
    provideHttpClient,
    withFetch,
    withInterceptorsFromDi,
} from '@angular/common/http';
import * as Sentry from '@sentry/angular';
import { authInterceptorProvider } from './interceptors/auth.interceptor';
import {
    errorNotificationInterceptorProvider,
    provideLogProductionMode,
    provideLogProviders,
    createIndexedDBLogProvider,
    createSentryLogProvider,
} from '@drevo-web/core';
import { environment } from '../environments/environment';

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
        provideRouter(appRoutes),
        provideHttpClient(withFetch(), withInterceptorsFromDi()),
        authInterceptorProvider,
        errorNotificationInterceptorProvider,
        importProvidersFrom(
            RouterModule.forRoot(appRoutes, { enableTracing: routesTracing })
        ),
        // Sentry ErrorHandler and Tracing for catching unhandled Angular errors
        ...(environment.sentryDsn
            ? [
                  {
                      provide: ErrorHandler,
                      useValue: Sentry.createErrorHandler(),
                  },
                  { provide: Sentry.TraceService, deps: [Router] },
                  provideAppInitializer(() => {
                      inject(Sentry.TraceService);
                  }),
              ]
            : []),
        // Logging configuration
        provideLogProductionMode(environment.production),
        provideLogProviders(logProviders),
    ],
};
