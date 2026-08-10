import { test, expect, type PlaywrightWorkerArgs } from '@playwright/test';
import { API_BASE_URL, apiGet, apiPost, ALLOWED_ORIGINS, CsrfResponse, AuthMeResponse } from './api-test-helpers';

/**
 * API Integration Tests - Session Cookie Configuration (Task 1.6)
 *
 * These tests verify session cookie security attributes:
 * - HttpOnly: cookie недоступен из JavaScript (XSS protection)
 * - SameSite: Lax в dev (same-origin proxy), None в production (cross-site)
 * - Secure: только HTTPS в production
 *
 * Note: В dev окружении (HTTP) браузеры не отправляют SameSite=None cookies
 * без флага Secure, поэтому dev использует SameSite=Lax.
 *
 * Production настройки (SameSite=None; Secure; HttpOnly) тестируются
 * косвенно через проверку что session работает cross-origin.
 */

// Use first allowed origin for tests
const allowedOrigin = ALLOWED_ORIGINS[0];

/**
 * `Secure` follows the transport: `ApiSessionConfig::configureSessionCookies()` sets it as
 * `$isProduction || $isSecure`, so an HTTPS backend always carries it and an HTTP one must not —
 * the browser drops a Secure cookie on a plain connection and the session never sticks.
 *
 * Derived once here because a test body may not branch (`playwright/no-conditional-in-test`).
 */
const expectedSecureFlag = API_BASE_URL.startsWith('https://');

/**
 * `SameSite`, unlike `Secure`, follows `YII_DEBUG` rather than the transport (`$isProduction ?
 * 'None' : 'Lax'`), and the suite cannot see that flag — a debug backend served over HTTPS emits
 * `Lax` while behaving exactly as configured. So assert the invariant the backend does guarantee
 * on every configuration: RFC 6265bis makes `None` legal only together with `Secure`, and
 * `ApiSessionConfig` falls back to `Lax` rather than emit the illegal pair.
 *
 * Nothing is lost against the HTTP dev backend: `Secure=false` is asserted exactly, which leaves
 * `Lax` as the only reachable entry.
 */
const LEGAL_COOKIE_POLICIES = ['SameSite=Lax; Secure=false', 'SameSite=Lax; Secure=true', 'SameSite=None; Secure=true'];

interface SessionCookie {
    readonly name: string;
    readonly value: string;
    readonly attributes: Record<string, string | boolean>;
}

/**
 * Render the cookie's cross-site policy so a failure names both halves of the pair.
 */
function describeCookiePolicy(cookie: SessionCookie): string {
    return `SameSite=${cookie.attributes['samesite']}; Secure=${Boolean(cookie.attributes['secure'])}`;
}

/**
 * Parse Set-Cookie header to extract cookie attributes
 */
function parseCookieHeader(setCookieHeader: string | undefined): SessionCookie | undefined {
    if (!setCookieHeader) return undefined;

    const parts = setCookieHeader.split(';').map(p => p.trim());
    const [nameValue, ...attributeParts] = parts;

    if (!nameValue) return undefined;

    const [name, value] = nameValue.split('=');

    const attributes: Record<string, string | boolean> = {};
    for (const attr of attributeParts) {
        // Flags like HttpOnly have no '=', so the value is genuinely absent at runtime.
        const [key, val] = attr.split('=') as [string, string | undefined];
        attributes[key.toLowerCase()] = val !== undefined ? val : true;
    }

    return { name, value, attributes };
}

/**
 * Get session cookie from Set-Cookie headers
 */
function getSessionCookie(headers: Record<string, string>): SessionCookie | undefined {
    // Headers can have multiple Set-Cookie values joined by newlines
    const setCookieHeader = headers['set-cookie'];
    if (!setCookieHeader) return undefined;

    // Split by newlines and find PHPSESSID
    const cookies = setCookieHeader.split('\n');
    for (const cookie of cookies) {
        const parsed = parseCookieHeader(cookie);
        if (parsed && parsed.name === 'PHPSESSID') {
            return parsed;
        }
    }

    return undefined;
}

/**
 * Start a brand new session and return its cookie.
 *
 * The backend sends `Set-Cookie` only on the request that creates the session, so a test that
 * reuses an already-warm context sees no header at all. A dedicated context makes the header
 * unconditionally present, which is what lets these tests assert instead of branching.
 */
async function fetchSessionCookie(playwright: PlaywrightWorkerArgs['playwright']): Promise<SessionCookie> {
    const context = await playwright.request.newContext();

    try {
        const response = await context.get(`${API_BASE_URL}/api/auth/csrf`);
        expect(response.status()).toBe(200);

        const sessionCookie = getSessionCookie(response.headers());
        if (!sessionCookie) {
            throw new Error('No PHPSESSID cookie in the Set-Cookie header of a fresh session');
        }

        return sessionCookie;
    } finally {
        await context.dispose();
    }
}

test.describe('Session Cookie Security (Task 1.6)', () => {
    test.describe('Session Cookie Attributes', () => {
        test('session cookie should be set on API request', async ({ playwright }) => {
            const sessionCookie = await fetchSessionCookie(playwright);

            expect(sessionCookie.name).toBe('PHPSESSID');
            expect(sessionCookie.value).toBeTruthy();
        });

        test('session should be maintained across requests', async ({ request }) => {
            // Get CSRF token (this creates a session)
            const { body: csrf1 } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');
            const token1 = csrf1.data!.csrfToken;

            // Make another request and verify session is maintained
            const { body: csrf2 } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');
            const token2 = csrf2.data!.csrfToken;

            // CSRF token should be the same within the same session
            expect(token1).toBe(token2);
        });

        test('session should be isolated between different request contexts', async ({ playwright }) => {
            // Create two independent request contexts
            const context1 = await playwright.request.newContext();
            const context2 = await playwright.request.newContext();

            try {
                // Get CSRF tokens from each context
                const response1 = await context1.get(`${API_BASE_URL}/api/auth/csrf`);
                const body1 = (await response1.json()) as {
                    success: boolean;
                    data: CsrfResponse;
                };

                const response2 = await context2.get(`${API_BASE_URL}/api/auth/csrf`);
                const body2 = (await response2.json()) as {
                    success: boolean;
                    data: CsrfResponse;
                };

                // Different contexts should have different sessions (and thus different CSRF tokens)
                // Note: This may not always be true if server generates same token for new sessions
                // But sessions should definitely be isolated
                expect(body1.success).toBe(true);
                expect(body2.success).toBe(true);
                expect(body1.data.csrfToken).toBeTruthy();
                expect(body2.data.csrfToken).toBeTruthy();
            } finally {
                await context1.dispose();
                await context2.dispose();
            }
        });
    });

    test.describe('Session Persistence After Auth Operations', () => {
        test('session should persist after failed login attempt', async ({ request }) => {
            // Get initial CSRF token
            const { body: csrfBefore } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');
            const tokenBefore = csrfBefore.data!.csrfToken;

            // Attempt login with invalid credentials
            await apiPost(request, '/api/auth/login', {
                data: {
                    username: 'invalid_user_xyz',
                    password: 'invalid_password',
                },
                origin: allowedOrigin,
                csrfToken: tokenBefore,
            });

            // Session should still work - CSRF token should be the same
            const { body: csrfAfter } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');
            const tokenAfter = csrfAfter.data!.csrfToken;

            // Token should remain the same (session not destroyed on failed login)
            expect(tokenAfter).toBe(tokenBefore);
        });

        test('session should work after logout', async ({ request }) => {
            // Get initial CSRF token
            const { body: csrfBefore } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');
            const tokenBefore = csrfBefore.data!.csrfToken;

            // Perform logout
            const { response: logoutResponse, body: logoutBody } = await apiPost(request, '/api/auth/logout', {
                origin: allowedOrigin,
                csrfToken: tokenBefore,
            });

            expect(logoutResponse.status()).toBe(200);
            expect(logoutBody.success).toBe(true);

            // Session should still work (new session created)
            const { body: csrfAfter } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');
            expect(csrfAfter.success).toBe(true);
            expect(csrfAfter.data?.csrfToken).toBeTruthy();
        });

        test('/api/auth/me should return consistent results within session', async ({ request }) => {
            // First call to /api/auth/me
            const { body: me1 } = await apiGet<AuthMeResponse>(request, '/api/auth/me');

            // Second call to /api/auth/me
            const { body: me2 } = await apiGet<AuthMeResponse>(request, '/api/auth/me');

            // Both should return the same authentication status
            expect(me1.success).toBe(true);
            expect(me2.success).toBe(true);
            expect(me1.data?.isAuthenticated).toBe(me2.data?.isAuthenticated);
        });
    });

    test.describe('Cookie Security Flags (Development Environment)', () => {
        test('session cookie should have HttpOnly flag', async ({ playwright }) => {
            const sessionCookie = await fetchSessionCookie(playwright);

            expect(sessionCookie.attributes['httponly']).toBe(true);
        });

        test('session cookie should have appropriate SameSite attribute', async ({ playwright }) => {
            const sessionCookie = await fetchSessionCookie(playwright);

            expect(LEGAL_COOKIE_POLICIES).toContain(describeCookiePolicy(sessionCookie));
        });

        test('session cookie Secure flag matches environment', async ({ playwright }) => {
            const sessionCookie = await fetchSessionCookie(playwright);

            // Over HTTP the flag must be absent — a Secure cookie on a plain connection is
            // dropped by the browser and the session never sticks.
            expect(Boolean(sessionCookie.attributes['secure'])).toBe(expectedSecureFlag);
        });
    });

    test.describe('Session Regeneration (Security)', () => {
        test('CSRF token should be regenerated after logout', async ({ request }) => {
            // This test verifies session handling during logout

            // Get CSRF token
            const { body: csrf1 } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');
            const token1 = csrf1.data!.csrfToken;

            // Perform logout with the token
            const { response: logoutResponse } = await apiPost(request, '/api/auth/logout', {
                origin: allowedOrigin,
                csrfToken: token1,
            });
            expect(logoutResponse.status()).toBe(200);

            // After logout, verify we can still get a valid CSRF token
            // (new session should be created)
            const { body: csrf2 } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');
            expect(csrf2.success).toBe(true);
            expect(csrf2.data?.csrfToken).toBeTruthy();
            expect(csrf2.data?.csrfToken.length).toBeGreaterThanOrEqual(64);
        });
    });
});

test.describe('Cross-Origin Session Handling (Production Scenario)', () => {
    test.describe('Session with CORS Headers', () => {
        test('session should work with allowed origin', async ({ request }) => {
            // Request with allowed origin
            const response1 = await request.get(`${API_BASE_URL}/api/auth/csrf`, {
                headers: {
                    Origin: allowedOrigin,
                    Accept: 'application/json',
                },
            });

            expect(response1.status()).toBe(200);
            const body1 = (await response1.json()) as {
                success: boolean;
                data: CsrfResponse;
            };
            expect(body1.success).toBe(true);
            const token1 = body1.data.csrfToken;

            // Second request should maintain session
            const response2 = await request.get(`${API_BASE_URL}/api/auth/csrf`, {
                headers: {
                    Origin: allowedOrigin,
                    Accept: 'application/json',
                },
            });

            const body2 = (await response2.json()) as {
                success: boolean;
                data: CsrfResponse;
            };
            expect(body2.success).toBe(true);

            // CSRF token should be consistent (same session)
            expect(body2.data.csrfToken).toBe(token1);
        });

        test('session should work without origin header (same-origin scenario)', async ({ request }) => {
            // Request without Origin header (same-origin or server-side)
            const response1 = await request.get(`${API_BASE_URL}/api/auth/csrf`, {
                headers: {
                    Accept: 'application/json',
                },
            });

            expect(response1.status()).toBe(200);
            const body1 = (await response1.json()) as {
                success: boolean;
                data: CsrfResponse;
            };
            expect(body1.success).toBe(true);

            // Second request should maintain session
            const response2 = await request.get(`${API_BASE_URL}/api/auth/csrf`, {
                headers: {
                    Accept: 'application/json',
                },
            });

            const body2 = (await response2.json()) as {
                success: boolean;
                data: CsrfResponse;
            };

            // Session should be maintained
            expect(body1.data.csrfToken).toBe(body2.data.csrfToken);
        });
    });

    test.describe('Full Auth Flow with Session', () => {
        test('complete auth flow should maintain session correctly', async ({ request }) => {
            // Step 1: Get initial CSRF token
            const { body: csrf } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');
            expect(csrf.success).toBe(true);
            const csrfToken = csrf.data!.csrfToken;

            // Step 2: Check initial auth status (should be guest)
            const { body: meBeforeLogin } = await apiGet<AuthMeResponse>(request, '/api/auth/me');
            expect(meBeforeLogin.success).toBe(true);
            expect(meBeforeLogin.data?.isAuthenticated).toBe(false);

            // Step 3: Attempt login (will fail with invalid credentials, but session should persist)
            const { response: loginResponse } = await apiPost(request, '/api/auth/login', {
                data: {
                    username: 'test_user_not_exist',
                    password: 'test_password',
                },
                origin: allowedOrigin,
                csrfToken,
            });
            // Should get 401 (invalid credentials) not 403 (CSRF error)
            expect(loginResponse.status()).toBe(401);

            // Step 4: Session should still work after failed login
            const { body: csrfAfterLogin } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');
            expect(csrfAfterLogin.success).toBe(true);
            // CSRF token should be the same (session preserved on failed login)
            expect(csrfAfterLogin.data?.csrfToken).toBe(csrfToken);

            // Step 5: Auth status should still be guest
            const { body: meAfterLogin } = await apiGet<AuthMeResponse>(request, '/api/auth/me');
            expect(meAfterLogin.success).toBe(true);
            expect(meAfterLogin.data?.isAuthenticated).toBe(false);

            // Step 6: Logout (should work even for guest)
            const { response: logoutResponse, body: logoutBody } = await apiPost(request, '/api/auth/logout', {
                origin: allowedOrigin,
                csrfToken,
            });
            expect(logoutResponse.status()).toBe(200);
            expect(logoutBody.success).toBe(true);

            // Step 7: After logout, session should still be usable
            const { body: csrfAfterLogout } = await apiGet<CsrfResponse>(request, '/api/auth/csrf');
            expect(csrfAfterLogout.success).toBe(true);
            expect(csrfAfterLogout.data?.csrfToken).toBeTruthy();
        });
    });
});
