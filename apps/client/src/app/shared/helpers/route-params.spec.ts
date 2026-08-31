import { parsePositiveIntParam } from './route-params';

describe('parsePositiveIntParam', () => {
    it('answers the number for a plain decimal id', () => {
        expect(parsePositiveIntParam('42')).toBe(42);
    });

    it.each([
        // Number() reads every JavaScript literal form, and none of them is an
        // id the route pattern names.
        ['hexadecimal', '0x2a'],
        ['exponential', '2e3'],
        ['signed', '+42'],
        ['padded with spaces', ' 42 '],
        ['fractional', '1.5'],
        // parseInt() would read the prefix and drop the rest.
        ['trailing garbage', '42abc'],
        ['zero', '0'],
        // A leading zero is one more address for an id that already has one.
        ['padded with zeros', '042'],
        ['negative', '-5'],
        ['empty', ''],
        // Past MAX_SAFE_INTEGER the conversion answers a different id than the
        // param names, and past ~1e308 it answers Infinity.
        ['above the safe integer range', '9007199254740993'],
        ['too long to convert', '9'.repeat(309)],
    ])('answers undefined for an id %s', (_case, value) => {
        expect(parsePositiveIntParam(value)).toBeUndefined();
    });

    it('answers undefined when the route names no param', () => {
        expect(parsePositiveIntParam(undefined)).toBeUndefined();
    });
});
