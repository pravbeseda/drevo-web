import {
    ApplicationConfig,
    importProvidersFrom,
    provideZonelessChangeDetection,
    provideAppInitializer,
    inject,
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
import { LoggerService } from '@drevo-web/core';
import { environment } from '../environments/environment';

const routesTracing = false;

export const appConfig: ApplicationConfig = {
    providers: [
        provideClientHydration(withEventReplay()),
        provideZonelessChangeDetection(),
        provideRouter(appRoutes),
        provideHttpClient(withFetch(), withInterceptorsFromDi()),
        authInterceptorProvider,
        importProvidersFrom(
            RouterModule.forRoot(appRoutes, { enableTracing: routesTracing })
        ),
        provideAppInitializer(() => {
            const logger = inject(LoggerService);
            logger.setProductionMode(environment.production);
        }),
    ],
};
