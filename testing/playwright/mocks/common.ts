/** Wrap data in a standard API success response */
export function apiSuccess<T>(data: T): { success: true; data: T } {
    return { success: true, data };
}

/** Create a standard API error response */
export function apiError(
    error: string,
    errorCode?: string,
): { success: false; error: string; errorCode?: string } {
    return { success: false, error, errorCode };
}
