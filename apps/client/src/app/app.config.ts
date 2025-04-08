import {
    ApplicationConfig,
    importProvidersFrom,
    provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, RouterModule } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

const routesTracing = false;

export const appConfig: ApplicationConfig = {
    providers: [
        provideClientHydration(withEventReplay()),
        provideExperimentalZonelessChangeDetection(),
        provideRouter(appRoutes),
        importProvidersFrom(RouterModule.forRoot(appRoutes, { enableTracing: routesTracing })),
    ],
};
