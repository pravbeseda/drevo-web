import {
    ApplicationConfig,
    provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import {
    provideRouter,
    withEnabledBlockingInitialNavigation,
} from '@angular/router';
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

export const appConfig: ApplicationConfig = {
    providers: [
        provideClientHydration(withEventReplay()),
        provideExperimentalZonelessChangeDetection(),
        provideRouter(appRoutes, withEnabledBlockingInitialNavigation()),
        provideHttpClient(withFetch(), withInterceptorsFromDi()),
    ],
};
