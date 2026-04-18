const CHUNK_ERROR_PATTERNS: readonly RegExp[] = [
    /Loading chunk \S+ failed/i,
    /Loading CSS chunk \S+ failed/i,
    /Failed to fetch dynamically imported module/i,
    /error loading dynamically imported module/i,
    /Importing a module script failed/i,
    /ChunkLoadError/i,
];

export function isChunkLoadError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }
    const { name, message } = error as { name?: unknown; message?: unknown };
    const haystack = [typeof name === 'string' ? name : '', typeof message === 'string' ? message : ''].join(' ');
    return CHUNK_ERROR_PATTERNS.some(pattern => pattern.test(haystack));
}
