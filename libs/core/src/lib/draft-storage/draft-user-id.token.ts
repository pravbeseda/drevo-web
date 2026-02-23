import { InjectionToken } from '@angular/core';

/**
 * Token providing a function that returns the current user's ID.
 * Returns undefined if the user is not authenticated.
 *
 * Must be explicitly provided at the app level (e.g., in app.config.ts)
 * with a factory that reads from AuthService.
 */
export const DRAFT_USER_ID_PROVIDER = new InjectionToken<() => string | undefined>('DRAFT_USER_ID_PROVIDER');
