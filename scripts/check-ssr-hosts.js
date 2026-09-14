/**
 * Guards the SSR host allow-list against the production build.
 *
 * `@angular/ssr` answers 400 to every request whose `Host` header is absent from
 * `security.allowedHosts`, and that list is baked into the build output rather
 * than read from any runtime config. An empty list therefore takes the whole
 * site down while lint, unit tests, Playwright and the build itself stay green —
 * which is what happened when the workspace moved to Angular 22.
 *
 * The check boots the built server instead of reading `project.json`, so it
 * keeps holding if Angular moves where the list comes from.
 *
 * It also boots the server on a port that is already taken: Express 5 hands the
 * listen error to the listen callback, so a callback that ignores it reports PM2
 * `ready` for a process that serves nothing, and `wait_ready` marks the deploy
 * healthy.
 *
 * Usage: yarn build && node scripts/check-ssr-hosts.js
 */

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');

const serverEntry = path.join(__dirname, '..', 'dist', 'apps', 'client', 'server', 'server.mjs');

const DEPLOYED_HOSTS = ['drevo-info.ru', 'app.drevo-info.ru', 'beta.drevo-info.ru', 'localhost'];
const FOREIGN_HOST = 'attacker.example.com';
const STARTUP_TIMEOUT_MS = 60_000;
const REQUEST_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 200;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const findFreePort = () =>
    new Promise((resolve, reject) => {
        const probe = net.createServer();
        probe.on('error', reject);
        probe.listen(0, '127.0.0.1', () => {
            const { port } = probe.address();
            probe.close(() => resolve(port));
        });
    });

const isListening = port =>
    new Promise(resolve => {
        const socket = net.connect({ port, host: '127.0.0.1' });
        const settle = result => {
            socket.destroy();
            resolve(result);
        };
        socket.on('connect', () => settle(true));
        socket.on('error', () => settle(false));
    });

const waitForServer = async (port, child) => {
    const deadline = Date.now() + STARTUP_TIMEOUT_MS;
    while (Date.now() < deadline) {
        if (child.exitCode !== null) {
            throw new Error(`the server exited with code ${child.exitCode} before it listened`);
        }
        if (await isListening(port)) {
            return;
        }
        await delay(POLL_INTERVAL_MS);
    }
    throw new Error(`the server did not listen on port ${port} within ${STARTUP_TIMEOUT_MS}ms`);
};

/**
 * `@angular/ssr` rejects a host before it renders anything, so a request that
 * gets past the check may still fail on an unreachable backend. Only the
 * rejection itself is a verdict here.
 *
 * `fetch` cannot drive this: `Host` is a forbidden header there and undici drops
 * it silently, leaving every request labelled with the loopback address.
 */
const isHostRejected = (port, host) =>
    new Promise((resolve, reject) => {
        const request = http.request({ host: '127.0.0.1', port, path: '/', headers: { Host: host } }, response => {
            if (response.statusCode !== 400) {
                response.resume();
                resolve(false);
                return;
            }

            let body = '';
            response.setEncoding('utf8');
            response.on('data', chunk => (body += chunk));
            response.on('end', () => resolve(body.includes('is not allowed')));
        });

        request.setTimeout(REQUEST_TIMEOUT_MS, () => request.destroy(new Error(`no answer for host "${host}"`)));
        request.on('error', reject);
        request.end();
    });

const occupyPort = () =>
    new Promise((resolve, reject) => {
        const blocker = net.createServer();
        blocker.on('error', reject);
        blocker.listen(0, () => resolve(blocker));
    });

/**
 * The IPC channel is what gives the child a `process.send`, the same way PM2 does;
 * without it the server skips the `ready` signal and a broken callback would pass.
 */
const startOnOccupiedPort = async () => {
    const blocker = await occupyPort();
    const child = spawn(process.execPath, [serverEntry], {
        env: { ...process.env, PORT: String(blocker.address().port) },
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });

    try {
        return await new Promise(resolve => {
            const timer = setTimeout(() => resolve('timeout'), STARTUP_TIMEOUT_MS);
            child.on('message', message => {
                if (message === 'ready') {
                    clearTimeout(timer);
                    resolve('ready');
                }
            });
            child.on('exit', code => {
                clearTimeout(timer);
                resolve(code === 0 ? 'clean exit' : 'failed');
            });
        });
    } finally {
        child.kill();
        blocker.close();
    }
};

const STARTUP_OUTCOME_FAILURES = {
    ready: 'reported PM2 "ready" without listening',
    'clean exit': 'exited with code 0',
    timeout: `neither exited nor reported within ${STARTUP_TIMEOUT_MS}ms`,
};

const run = async () => {
    if (!fs.existsSync(serverEntry)) {
        throw new Error(`${serverEntry} is missing — run \`yarn build\` first`);
    }

    const port = await findFreePort();
    const child = spawn(process.execPath, [serverEntry], {
        env: { ...process.env, PORT: String(port) },
        stdio: ['ignore', 'ignore', 'pipe'],
    });

    // A rejected host makes the server log an error, so a passing run would otherwise
    // print the very message this check exists to keep out of production.
    let serverErrors = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => (serverErrors += chunk));

    const hostFailures = [];
    try {
        await waitForServer(port, child);

        for (const host of DEPLOYED_HOSTS) {
            if (await isHostRejected(port, host)) {
                hostFailures.push(`"${host}" is rejected but the deployment serves it`);
            }
        }

        // Opposite in sign to the loop above, and load-bearing for it: a verdict that inverts,
        // or a probe that stops varying `Host`, fails one of the two rather than passing both.
        if (!(await isHostRejected(port, FOREIGN_HOST))) {
            hostFailures.push(`"${FOREIGN_HOST}" is accepted — the host check is disabled`);
        }
    } finally {
        child.kill();
    }

    const startupOutcome = await startOnOccupiedPort();

    return { hostFailures, serverErrors, startupFailure: STARTUP_OUTCOME_FAILURES[startupOutcome] };
};

run().then(
    ({ hostFailures, serverErrors, startupFailure }) => {
        if (hostFailures.length > 0) {
            console.error('the production server lost its SSR host allow-list\n');
            for (const failure of hostFailures) {
                console.error(`  ✗ ${failure}`);
            }
            console.error('\nfix: `security.allowedHosts` under the `build` target in apps/client/project.json');
            console.error(`\nserver log:\n${serverErrors}`);
        }

        if (startupFailure) {
            console.error(`the production server started on a taken port and ${startupFailure}`);
            console.error(
                '\nfix: exit with a non-zero code on the error the `app.listen` callback receives in apps/client/src/server.ts — a rethrow only gets logged by the `uncaughtException` handler AngularNodeAppEngine installs',
            );
        }

        if (hostFailures.length > 0 || startupFailure) {
            process.exit(1);
        }

        console.log(`SSR host allow-list OK: ${DEPLOYED_HOSTS.join(', ')}`);
        console.log('SSR startup on a taken port fails OK');
    },
    error => {
        console.error(`SSR server check could not run: ${error.message}`);
        process.exit(1);
    },
);
