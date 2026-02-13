import { HttpContextToken } from '@angular/common/http';

/**
 * HTTP Context tokens for controlling error notification behavior.
 *
 * @example
 * // Disable error toast for a specific request
 * this.http.get('/api/data', {
 *   context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true)
 * });
 *
 * @example
 * // Custom error message
 * this.http.post('/api/action', body, {
 *   context: new HttpContext().set(CUSTOM_ERROR_MESSAGE, 'Failed to save changes')
 * });
 */

/**
 * When true, the error notification interceptor will NOT show a toast for this request.
 * Useful for requests where you handle errors manually (e.g., form validation, silent retries).
 */
export const SKIP_ERROR_NOTIFICATION = new HttpContextToken<boolean>(() => false);

/**
 * Custom error message to show instead of the auto-mapped message.
 * If set to a non-empty string, this message will be used instead of HTTP status mapping.
 */
export const CUSTOM_ERROR_MESSAGE = new HttpContextToken<string>(() => '');

/**
 * Skip notification only for specific HTTP status codes.
 * Useful when you want to handle certain errors (e.g., 404) yourself but show others.
 *
 * @example
 * context: new HttpContext().set(SKIP_ERROR_FOR_STATUSES, [404, 409])
 */
export const SKIP_ERROR_FOR_STATUSES = new HttpContextToken<number[]>(() => []);
