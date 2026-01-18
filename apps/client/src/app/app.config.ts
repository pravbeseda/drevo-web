import {
    ApplicationConfig,
    importProvidersFrom,
    provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, RouterModule } from '@angular/router';
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
import { authInterceptorProvider } from './interceptors/auth.interceptor';
import {
    errorNotificationInterceptorProvider,
    provideLogProductionMode,
    provideLogProviders,
    createIndexedDBLogProvider,
} from '@drevo-web/core';
import { environment } from '../environments/environment';

const routesTracing = false;

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
        // Logging configuration
        provideLogProductionMode(environment.production),
        provideLogProviders([createIndexedDBLogProvider()]),
    ],
};
