import {
    AngularNodeAppEngine,
    createNodeRequestHandler,
    isMainModule,
    writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { type Application } from 'express';
import { createProxyMiddleware, type Options } from 'http-proxy-middleware';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LoggerService } from './app/services/logger/logger.service';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

// Get base path from environment variable or default to '/'
const BASE_PATH = process.env['BASE_PATH'] || '/';
const normalizedBasePath =
    BASE_PATH === '/' ? '' : BASE_PATH.replace(/\/$/, '');

const app = express();
const angularApp = new AngularNodeAppEngine();
const logger = new LoggerService();

logger.info(`Server configured with BASE_PATH: ${BASE_PATH}`);
configureProxy(app);

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/**', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 * Dynamically handle base path based on environment
 */
if (normalizedBasePath) {
    // Serve static files at the configured base path
    app.use(
        normalizedBasePath,
        express.static(browserDistFolder, {
            maxAge: '1y',
            index: false,
            redirect: false,
        })
    );
}

// Always serve static files at root for direct asset access
app.use(
    express.static(browserDistFolder, {
        maxAge: '1y',
        index: false,
        redirect: false,
    })
);

/**
 * Handle all other requests by rendering the Angular application.
 * Dynamically handle routing based on configured base path
 */
if (normalizedBasePath) {
    // Redirect root to configured base path
    app.get('/', (req, res) => {
        res.redirect(BASE_PATH);
    });

    // Handle all requests under the base path with Angular SSR
    app.use(`${normalizedBasePath}/*`, (req, res, next) => {
        angularApp
            .handle(req)
            .then(response =>
                response ? writeResponseToNodeResponse(response, res) : next()
            )
            .catch(next);
    });

    // Fallback for any other routes - redirect to base path
    app.use('/*', (req, res) => {
        const targetPath = normalizedBasePath + req.path;
        res.redirect(targetPath);
    });
} else {
    // Handle requests at root level when BASE_PATH is '/'
    app.use('/*', (req, res, next) => {
        angularApp
            .handle(req)
            .then(response =>
                response ? writeResponseToNodeResponse(response, res) : next()
            )
            .catch(next);
    });
}

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */

// When running under PM2, isMainModule() returns false because process.argv[1] points to
// PM2's ProcessContainerFork.js instead of our server file. We check for PM2_HOME as a
// reliable fallback to detect PM2 execution environment.
const shouldStartServer =
    isMainModule(import.meta.url) || process.env['PM2_HOME'] !== undefined;

if (shouldStartServer) {
    const port = process.env['PORT'] || 4000;

    app.listen(port, () => {
        logger.info(
            `Node Express server listening on http://localhost:${port}`
        );

        // Send ready signal to PM2 if running under PM2
        if (process.send) {
            process.send('ready');
        }
    });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

function configureProxy(app: Application): void {
    const proxyConfigPath = process.env['PROXY_CONFIG'];

    if (!proxyConfigPath) {
        return;
    }

    try {
        const resolvedPath = resolve(process.cwd(), proxyConfigPath);

        if (!existsSync(resolvedPath)) {
            logger.warn(
                `[Proxy] Configuration file not found at ${resolvedPath}. Skipping proxy setup.`
            );
            return;
        }

        const config = JSON.parse(
            readFileSync(resolvedPath, 'utf-8')
        ) as Record<string, Options>;

        Object.entries(config).forEach(([context, options]) => {
            if (!options?.target) {
                logger.warn(
                    `[Proxy] Skipping proxy for ${context}: missing target`
                );
                return;
            }

            const middleware = createProxyMiddleware({
                ...options,
                pathFilter: options.pathFilter ?? context,
            });

            app.use(middleware);
            logger.info(`[Proxy] ${context} → ${options.target}`);
        });
    } catch (error) {
        logger.error(
            `[Proxy] Failed to configure proxy from ${proxyConfigPath}`,
            error
        );
    }
}
