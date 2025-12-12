import {
    AngularNodeAppEngine,
    createNodeRequestHandler,
    isMainModule,
    writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, {
    type Application,
    type Request,
    type Response,
} from 'express';
import { createProxyMiddleware, type Options } from 'http-proxy-middleware';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import cookieParser from 'cookie-parser';
import * as jwt from 'jsonwebtoken';
import { LoggerService } from './app/services/logger/logger.service';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const BASE_PATH = process.env['BASE_PATH'] || '/';
const normalizedBasePath =
    BASE_PATH === '/' ? '' : BASE_PATH.replace(/\/$/, '');

const JWT_SECRET =
    process.env['JWT_SECRET'] || 'dev-secret-change-in-production-min-32-chars';
const YII_API_URL = process.env['YII_API_URL'] || 'http://drevo-local.ru';
const COOKIE_DOMAIN = process.env['COOKIE_DOMAIN'] || undefined;
const IS_PRODUCTION = process.env['NODE_ENV'] === 'production';
const AUTH_COOKIE_NAME = 'drevo_auth_token';

interface AuthUser {
    login: string;
    name: string;
    email: string;
    role: string;
}

declare module 'express-serve-static-core' {
    interface Request {
        user?: AuthUser;
    }
}

const require = createRequire(import.meta.url);
const app = express();
const angularApp = new AngularNodeAppEngine();
const logger = new LoggerService();

logger.info(`Server configured with BASE_PATH: ${BASE_PATH}`);

app.use(cookieParser());
app.use(express.json());

app.use((req: Request, _res, next) => {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
            req.user = {
                login: decoded.sub as string,
                name: decoded['name'] as string,
                email: (decoded['email'] as string) || '',
                role: decoded['role'] as string,
            };
        } catch {
            // Token invalid or expired
        }
    }
    next();
});

// Auth endpoints must be before proxy middleware
app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
        const response = await fetch(`${YII_API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
            credentials: 'include',
        });

        const data = await response.json();

        if (data.success && data.token) {
            const maxAge = req.body.rememberMe
                ? 30 * 24 * 60 * 60 * 1000
                : undefined;
            res.cookie(AUTH_COOKIE_NAME, data.token, {
                httpOnly: true,
                secure: IS_PRODUCTION,
                sameSite: 'lax',
                maxAge,
                path: '/',
                domain: COOKIE_DOMAIN,
            });

            const setCookieHeader = response.headers.get('set-cookie');
            if (setCookieHeader) {
                res.append('Set-Cookie', setCookieHeader);
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { token, ...safeData } = data;
        res.json(safeData);
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

app.post('/api/auth/logout', async (req: Request, res: Response) => {
    try {
        res.clearCookie(AUTH_COOKIE_NAME, { path: '/', domain: COOKIE_DOMAIN });

        await fetch(`${YII_API_URL}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: { Cookie: req.headers.cookie || '' },
        });

        res.json({ success: true });
    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

app.get('/api/auth/me', (req: Request, res: Response) => {
    if (req.user) {
        res.json({ success: true, user: req.user });
    } else {
        res.status(401).json({ success: false, error: 'Not authenticated' });
    }
});

configureProxy(app);

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

        const config = loadProxyConfig(resolvedPath);

        if (!config) {
            logger.warn(
                `[Proxy] Unsupported proxy config format for ${resolvedPath}`
            );
            return;
        }

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

function loadProxyConfig(resolvedPath: string): Record<string, Options> | null {
    const extension = extname(resolvedPath);

    if (extension === '.js' || extension === '.cjs') {
        const moduleExports = require(resolvedPath) as
            | Record<string, Options>
            | { default: Record<string, Options> };
        return (
            (moduleExports as { default?: Record<string, Options> }).default ??
            (moduleExports as Record<string, Options>)
        );
    }

    if (extension === '.json') {
        return JSON.parse(readFileSync(resolvedPath, 'utf-8')) as Record<
            string,
            Options
        >;
    }

    return null;
}
