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

const routesTracing = false;

export const appConfig: ApplicationConfig = {
    providers: [
        provideClientHydration(withEventReplay()),
        provideZonelessChangeDetection(),
        provideRouter(appRoutes),
        provideHttpClient(withFetch(), withInterceptorsFromDi()),
        importProvidersFrom(
            RouterModule.forRoot(appRoutes, { enableTracing: routesTracing })
        ),
    ],
};
