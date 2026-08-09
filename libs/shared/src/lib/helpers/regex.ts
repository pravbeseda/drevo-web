/**
 * Reads a capture group that the pattern may leave unfilled.
 *
 * `RegExpMatchArray` types every index as `string`, so an optional group reads
 * as always present and the fallback next to it looks redundant. Going through
 * a `readonly (string | undefined)[]` view restores the type the runtime has.
 */
export function optionalGroup(match: RegExpMatchArray, index: number): string | undefined {
    const groups: readonly (string | undefined)[] = match;
    return groups[index];
}
