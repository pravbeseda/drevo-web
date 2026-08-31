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
        ['negative', '-5'],
        ['empty', ''],
    ])('answers undefined for an id %s', (_case, value) => {
        expect(parsePositiveIntParam(value)).toBeUndefined();
    });

    it('answers undefined when the route names no param', () => {
        expect(parsePositiveIntParam(undefined)).toBeUndefined();
    });
});
