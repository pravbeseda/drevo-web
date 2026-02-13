export function assert(condition: boolean, errorMessage: string): asserts condition {
    if (!condition) {
        throw new Error(getErrorMessage(errorMessage));
    }
}

export function assertIsDefined<T>(value: T, errorMsg: string): asserts value is NonNullable<T> {
    assert(isDefined(value), errorMsg);
}

function getErrorMessage(message: string): string {
    return `${message} ${new Error().stack?.split('\n')?.slice(1, 4).join('\n')}`;
}

export function isDefined<T>(val: T | null | undefined): val is T {
    // eslint-disable-next-line no-null/no-null
    return val !== null && val !== undefined;
}
