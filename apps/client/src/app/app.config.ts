import {
    ApplicationConfig,
    importProvidersFrom,
    provideExperimentalZonelessChangeDetection,
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
import { VERSION_CONFIG } from '@drevo-web/shared';
import { environment } from '../environments/environment';

const routesTracing = false;

export const appConfig: ApplicationConfig = {
    providers: [
        provideClientHydration(withEventReplay()),
        provideExperimentalZonelessChangeDetection(),
        provideRouter(appRoutes),
        provideHttpClient(withFetch(), withInterceptorsFromDi()),
        importProvidersFrom(
            RouterModule.forRoot(appRoutes, { enableTracing: routesTracing })
        ),
        {
            provide: VERSION_CONFIG,
            useValue: { version: environment.version }
        },
    ],
};
