/**
 * A decimal id and nothing else. `Number()` on its own reads every JavaScript
 * literal form, so `0x2a`, `2e3`, `+42` and ` 42 ` would all resolve to a real
 * id under an address the route pattern never names; `parseInt(x, 10)` has the
 * mirror flaw — it reads a prefix and drops the rest, turning `42abc` into 42.
 */
const POSITIVE_INT_PATTERN = /^\d+$/;

/**
 * Answers the number a route param denotes, or undefined when the param is
 * absent or is anything other than a decimal integer greater than zero.
 */
export function parsePositiveIntParam(value: string | undefined): number | undefined {
    if (value === undefined || !POSITIVE_INT_PATTERN.test(value)) {
        return undefined;
    }

    const parsed = Number(value);
    return parsed > 0 ? parsed : undefined;
}
