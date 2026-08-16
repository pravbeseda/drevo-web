/**
 * Patterns for detecting sensitive data in log entries
 */
const SENSITIVE_PATTERNS = [
    /password/i,
    /token/i,
    /secret/i,
    /authorization/i,
    /api_key/i,
    /apikey/i,
    /api-key/i,
    /bearer/i,
    /credential/i,
    /private/i,
];

const REDACTED = '[REDACTED]';

/**
 * Check if a key name matches any sensitive pattern
 */
function isSensitiveKey(key: string): boolean {
    return SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
}

/**
 * Recursively sanitize an object, masking sensitive values
 * @param value - Value to sanitize (can be any type)
 * @param depth - Current recursion depth (prevents infinite loops)
 * @returns Sanitized copy of the value
 */
export function sanitizeLogData(value: unknown, depth = 0): unknown {
    // Prevent infinite recursion
    if (depth > 10) {
        return '[MAX_DEPTH_EXCEEDED]';
    }

    if (!value || typeof value !== 'object') {
        return value;
    }

    // Handle Date
    if (value instanceof Date) {
        return value;
    }

    // Handle Error
    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: value.stack,
        };
    }

    // Handle arrays. `Array.isArray` narrows `unknown` to `any[]`, so the element type has to be
    // put back by hand — otherwise every element travels on as `any`.
    if (Array.isArray(value)) {
        const items: unknown[] = value;

        return items.map(item => sanitizeLogData(item, depth + 1));
    }

    // Handle objects. `Object.entries` infers its value type as `any` for a loose object, so the
    // entries are annotated for the same reason as the array branch above.
    const sanitized: Record<string, unknown> = {};
    const entries: readonly (readonly [string, unknown])[] = Object.entries(value);
    for (const [key, val] of entries) {
        if (isSensitiveKey(key)) {
            sanitized[key] = REDACTED;
        } else {
            sanitized[key] = sanitizeLogData(val, depth + 1);
        }
    }

    return sanitized;
}

/**
 * Sanitize a log entry, masking sensitive data in the data field
 */
export function sanitizeLogEntry<T extends { data?: unknown }>(entry: T): T {
    if (entry.data === undefined) {
        return entry;
    }

    return {
        ...entry,
        data: sanitizeLogData(entry.data),
    };
}
