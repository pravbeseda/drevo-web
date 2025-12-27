# Authentication API Documentation

## Overview

The Authentication API provides endpoints for user authentication in the drevo-info.ru application. The API is designed for browser clients and uses HTTP-only session cookies for security.

## Base URL

| Environment | URL                                             |
|-------------|-------------------------------------------------|
| Development | `http://drevo-local.ru/api` (via Angular proxy) |
| Production  | `https://drevo-info.ru/api`                     |

## Security Model

### Cookie Configuration

| Environment | Secure | HttpOnly | SameSite |
|-------------|--------|----------|----------|
| Development | No     | Yes      | Lax      |
| Production  | Yes    | Yes      | None     |

**Note:** Production uses `SameSite=None` because the frontend (`new.drevo-info.ru`) and backend (`drevo-info.ru`) are cross-site for XHR requests.

### CSRF Protection

All state-changing endpoints (POST, PUT, DELETE, PATCH) require:

1. **CSRF Token** in `X-CSRF-Token` header
2. **Origin/Referer validation** - at least one must be present and valid

GET endpoints do not require CSRF tokens or Origin/Referer validation.

### Security Headers

All API responses include:

- `Content-Type: application/json; charset=utf-8`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: same-origin`
- `X-Frame-Options: DENY`
- `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`

## Endpoints

### GET /api/auth/csrf

Get a CSRF token for the current session.

**Security:** Public endpoint, no CSRF or Origin validation required.

**Request:**

```http
GET /api/auth/csrf HTTP/1.1
Accept: application/json
```

**Response Headers:**

```http
Cache-Control: no-store
Pragma: no-cache
```

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "csrfToken": "a1b2c3d4e5f6..."
    // 64+ hex characters
  }
}
```

**Usage:**

1. Call this endpoint before any state-changing request
2. Store the token and include it in subsequent POST/PUT/DELETE requests
3. Token is consistent within the same session
4. Token is regenerated after login

---

### POST /api/auth/login

Authenticate a user with username and password.

**Security:**

- Requires CSRF token in `X-CSRF-Token` header
- Requires valid Origin or Referer header

**Request:**

```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json
X-CSRF-Token: your-csrf-token
Origin: https://new.drevo-info.ru

{
  "username": "user@example.com",
  "password": "userpassword",
  "rememberMe": false
}
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | Username or email |
| password | string | Yes | User password |
| rememberMe | boolean | No | Extend session to 30 days (default: false) |

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "login": "testuser",
      "name": "Test User",
      "email": "user@example.com",
      "role": "user",
      "permissions": {
        "canEdit": true,
        "canModerate": false,
        "canAdmin": false
      }
    },
    "csrfToken": "new-token-after-login..."
  }
}
```

**Response 401 Unauthorized:**

```json
{
  "success": false,
  "error": "Invalid credentials",
  "errorCode": "INVALID_CREDENTIALS"
}
```

**Response 401 Unauthorized (Inactive Account):**

```json
{
  "success": false,
  "error": "Account is not activated",
  "errorCode": "ACCOUNT_NOT_ACTIVE"
}
```

**Response 403 Forbidden (Missing CSRF):**

```json
{
  "success": false,
  "error": "CSRF token validation failed",
  "errorCode": "CSRF_VALIDATION_FAILED"
}
```

**Response 403 Forbidden (Missing Origin):**

```json
{
  "success": false,
  "error": "Origin or Referer header is required for this request",
  "errorCode": "ORIGIN_REQUIRED"
}
```

**Response 403 Forbidden (Invalid Origin):**

```json
{
  "success": false,
  "error": "Origin not allowed",
  "errorCode": "ORIGIN_NOT_ALLOWED"
}
```

**Important Notes:**

- Session ID is regenerated after successful login (Session Fixation protection)
- CSRF token is regenerated and returned in response
- Use the new CSRF token for subsequent requests

---

### GET /api/auth/me

Get the current authenticated user's information.

**Security:** Public endpoint, no CSRF or Origin validation required.

**Request:**

```http
GET /api/auth/me HTTP/1.1
Accept: application/json
```

**Response 200 OK (Authenticated):**

```json
{
  "success": true,
  "data": {
    "isAuthenticated": true,
    "user": {
      "id": 123,
      "login": "testuser",
      "name": "Test User",
      "email": "user@example.com",
      "role": "user",
      "permissions": {
        "canEdit": true,
        "canModerate": false,
        "canAdmin": false
      }
    }
  }
}
```

**Response 200 OK (Guest):**

```json
{
  "success": true,
  "data": {
    "isAuthenticated": false
  }
}
```

**Note:** This endpoint never returns an error for authentication status. It returns `isAuthenticated: false` for guests.

---

### POST /api/auth/logout

Log out the current user and destroy the session.

**Security:**

- Requires CSRF token in `X-CSRF-Token` header
- Requires valid Origin or Referer header

**Request:**

```http
POST /api/auth/logout HTTP/1.1
Content-Type: application/json
X-CSRF-Token: your-csrf-token
Origin: https://new.drevo-info.ru
```

**Response 200 OK:**

```json
{
  "success": true
}
```

**Response 403 Forbidden (Missing CSRF):**

```json
{
  "success": false,
  "error": "CSRF token validation failed",
  "errorCode": "CSRF_VALIDATION_FAILED"
}
```

**Important Notes:**

- Session cookie is cleared
- Client should request a new CSRF token after logout

---

## User Object

| Field                   | Type    | Description                                  |
|-------------------------|---------|----------------------------------------------|
| id                      | number  | User ID                                      |
| login                   | string  | Username                                     |
| name                    | string  | Display name                                 |
| email                   | string  | Email address                                |
| role                    | string  | User role: `guest`, `user`, `moder`, `admin` |
| permissions             | object  | Permission flags                             |
| permissions.canEdit     | boolean | Can edit articles                            |
| permissions.canModerate | boolean | Can moderate content                         |
| permissions.canAdmin    | boolean | Has admin access                             |

---

## Error Codes

| Code                     | HTTP Status | Description                        |
|--------------------------|-------------|------------------------------------|
| `INVALID_CREDENTIALS`    | 401         | Wrong username or password         |
| `ACCOUNT_NOT_ACTIVE`     | 401         | Account not activated              |
| `CSRF_VALIDATION_FAILED` | 403         | Missing or invalid CSRF token      |
| `ORIGIN_REQUIRED`        | 403         | Missing Origin and Referer headers |
| `ORIGIN_NOT_ALLOWED`     | 403         | Origin not in whitelist            |

---

## CORS Configuration

CORS headers are applied only in production for cross-origin requests from the frontend.

**Allowed Origins:**

- `https://new.drevo-info.ru`

**CORS Headers:**

```http
Access-Control-Allow-Origin: https://new.drevo-info.ru
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-CSRF-Token
Access-Control-Max-Age: 86400
Vary: Origin
```

**Note:** Development uses Angular proxy (`localhost:4200/api/*` → `drevo-local.ru/api/*`), so CORS is not needed.

---

## Frontend Integration

### Angular AuthService Usage

```typescript
// Get CSRF token first
this.csrfService.getCsrfToken().subscribe(token => {
  // Token is automatically managed by CsrfService
});

// Login
this.authService.login({
  username: 'user@example.com',
  password: 'password',
  rememberMe: false
}).subscribe({
  next: (user) => console.log('Logged in as', user.name),
  error: (err) => console.error(err.message, err.code)
});

// Check auth status
this.authService.authState$.subscribe(state => {
  if (state.isAuthenticated) {
    console.log('User:', state.user?.name);
  } else if (state.isLoading) {
    console.log('Loading...');
  } else {
    console.log('Guest');
  }
});

// Logout
this.authService.logout().subscribe();
```

### HTTP Interceptor

The `AuthInterceptor` automatically:

- Adds `withCredentials: true` to all API requests
- Adds `X-CSRF-Token` header to state-changing requests
- Retries requests with fresh CSRF token on 403 CSRF_VALIDATION_FAILED
- Queues state-changing requests during login/logout operations

---

## Testing

### API Tests (E2E)

Located in `apps/client-e2e/src/api/`:

- `api-auth.spec.ts` - Authentication endpoint tests
- `api-csrf.spec.ts` - CSRF token tests
- `api-cors.spec.ts` - CORS configuration tests
- `api-session.spec.ts` - Session cookie tests
- `api-origin.spec.ts` - Origin validation tests

Run API tests:

```bash
npx nx e2e client-e2e --project=api
```

### Unit Tests

Located in `apps/client/src/app/services/auth/`:

- `auth.service.spec.ts` - Browser platform tests
- `auth.service.ssr.spec.ts` - SSR platform tests
- `csrf.service.spec.ts` - CSRF service tests

Run unit tests:

```bash
npx nx test client --testPathPattern=auth
```

---

## SSR Considerations

The authentication system uses a **client-only auth** strategy:

1. **Server-Side Rendering:** Pages are rendered as if for a guest user
2. **Client Hydration:** After hydration, `GET /api/auth/me` is called
3. **UI Update:** Auth status component updates from loading → actual state

This approach:

- ✅ Allows SSR HTML caching
- ✅ Reduces backend load
- ✅ Avoids cookie forwarding complexity
- ⚠️ Causes brief UI flicker on page load (skeleton → actual state)

---

## Security Checklist

- [x] HTTP-only cookies (XSS protection)
- [x] CSRF tokens for state-changing requests
- [x] Origin/Referer validation
- [x] Session ID regeneration on login (Session Fixation protection)
- [x] Secure flag in production (HTTPS only)
- [x] Security headers on all responses
- [x] No password in API responses
- [x] Error messages don't leak sensitive information
