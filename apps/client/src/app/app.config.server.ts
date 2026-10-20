import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { DELEGATE_ERROR_HANDLER } from './services/app-update/chunk-error-handler';
import { mergeApplicationConfig, ApplicationConfig, ErrorHandler } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';

const serverConfig: ApplicationConfig = {
    providers: [
        provideServerRendering(withRoutes(serverRoutes)),
        // LoggerService writes nothing on the server, so Angular's own handler is what puts the error in the server log
        { provide: DELEGATE_ERROR_HANDLER, useClass: ErrorHandler },
    ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
