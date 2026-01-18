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

    // Handle null/undefined - use == to catch both
    if (!value) {
        return value;
    }

    // Handle primitives
    if (typeof value !== 'object') {
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

    // Handle arrays
    if (Array.isArray(value)) {
        return value.map(item => sanitizeLogData(item, depth + 1));
    }

    // Handle objects
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
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
