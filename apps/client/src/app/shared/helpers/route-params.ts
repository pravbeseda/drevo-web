/**
 * A canonical decimal id and nothing else. `Number()` on its own reads every
 * JavaScript literal form, so `0x2a`, `2e3`, `+42` and ` 42 ` would all resolve
 * to a real id under an address the route pattern never names; `parseInt(x, 10)`
 * has the mirror flaw — it reads a prefix and drops the rest, turning `42abc`
 * into 42. Leading zeros are excluded for the same reason: `042` is one more
 * address for the entity `42` already has.
 */
const POSITIVE_INT_PATTERN = /^[1-9]\d*$/;

/**
 * Answers the number a route param denotes, or undefined when the param is
 * absent or is anything other than a canonical decimal integer greater than
 * zero. A digit string too long to survive the conversion is absent too: past
 * `Number.MAX_SAFE_INTEGER` the value returned would no longer be the one the
 * param names.
 */
export function parsePositiveIntParam(value: string | undefined): number | undefined {
    if (value === undefined || !POSITIVE_INT_PATTERN.test(value)) {
        return undefined;
    }

    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : undefined;
}
