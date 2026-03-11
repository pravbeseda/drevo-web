import { appRoutes } from './app.routes';
import { authInterceptorProvider } from './interceptors/auth.interceptor';
import { AuthService } from './services/auth/auth.service';
import { PageTitleStrategy } from './services/page-title.strategy';
import { environment } from '../environments/environment';
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { ApplicationConfig, inject, provideZonelessChangeDetection } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, TitleStrategy, withComponentInputBinding } from '@angular/router';
import {
    DRAFT_USER_ID_PROVIDER,
    errorNotificationInterceptorProvider,
    provideLogProductionMode,
    provideLogProviders,
    createIndexedDBLogProvider,
    createSentryLogProvider,
} from '@drevo-web/core';
import { getTopicIconPath, TOPICS } from '@drevo-web/shared';
import { provideSvgIcons } from '@drevo-web/ui';

// Build log providers array based on environment
const logProviders = [
    createIndexedDBLogProvider(),
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
        {
            provide: DRAFT_USER_ID_PROVIDER,
            useFactory: () => {
                const authService = inject(AuthService);
                return () => authService.currentUser?.login;
            },
        },
        // SVG icons registration
        provideSvgIcons(TOPICS.map(t => ({ name: t.icon, url: getTopicIconPath(t.icon) }))),
        // Logging configuration
        provideLogProductionMode(environment.production),
        provideLogProviders(logProviders),
    ],
};
