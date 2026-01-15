/**
 * URL security utilities to prevent Open Redirect attacks
 */

/**
 * Validates that a return URL is safe for redirection.
 *
 * Prevents Open Redirect vulnerabilities by ensuring the URL:
 * - Starts with a single slash (relative path)
 * - Does not start with // (protocol-relative URL)
 * - Does not start with /\ (IE-specific bypass)
 * - Does not use dangerous protocols (javascript:, data:, vbscript:, etc.)
 *
 * @param url - The URL to validate
 * @returns true if the URL is safe for redirection
 *
 * @example
 * ```typescript
 * isValidReturnUrl('/dashboard')     // true
 * isValidReturnUrl('/articles/123')  // true
 * isValidReturnUrl('//evil.com')     // false
 * isValidReturnUrl('javascript:...')  // false
 * ```
 */
export function isValidReturnUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
        return false;
    }

    // Must start with single slash (relative path)
    // Reject: //, /\, javascript:, data:, etc.
    return (
        url.startsWith('/') &&
        !url.startsWith('//') &&
        !url.startsWith('/\\') &&
        !/^[a-z]+:/i.test(url)
    );
}
