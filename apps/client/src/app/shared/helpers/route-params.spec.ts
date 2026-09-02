import { ActivatedRouteSnapshot, convertToParamMap, UrlSegment } from '@angular/router';
import { parsePositiveIntParam, readRouteParam } from './route-params';

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

function createRouteSnapshot(params: Record<string, string>, url: UrlSegment[]): ActivatedRouteSnapshot {
    return { paramMap: convertToParamMap(params), url } as ActivatedRouteSnapshot;
}

describe('readRouteParam', () => {
    it('answers the param value when no segment carries matrix params', () => {
        const route = createRouteSnapshot({ id: '42' }, [new UrlSegment('42', {})]);

        expect(readRouteParam(route, 'id')).toBe('42');
    });

    it('answers undefined when the last segment carries matrix params', () => {
        // Angular merges `;id=7` over the positional `id`, so the segment reading
        // `42` would resolve entity 7.
        const route = createRouteSnapshot({ id: '7' }, [new UrlSegment('42', { id: '7' })]);

        expect(readRouteParam(route, 'id')).toBeUndefined();
    });

    it('answers undefined when an earlier segment carries matrix params', () => {
        const route = createRouteSnapshot({ id: '42' }, [
            new UrlSegment('articles', { id: '7' }),
            new UrlSegment('42', {}),
        ]);

        expect(readRouteParam(route, 'id')).toBeUndefined();
    });

    it('answers undefined when a matrix param has an empty value', () => {
        const route = createRouteSnapshot({ id2: '' }, [new UrlSegment('42', { id2: '' })]);

        expect(readRouteParam(route, 'id2')).toBeUndefined();
    });

    it('answers undefined when a matrix param names something else than the param read', () => {
        const route = createRouteSnapshot({ id: '42' }, [new UrlSegment('42', { utm: 'x' })]);

        expect(readRouteParam(route, 'id')).toBeUndefined();
    });

    it('answers undefined when the route names no such param', () => {
        const route = createRouteSnapshot({}, [new UrlSegment('42', {})]);

        expect(readRouteParam(route, 'id')).toBeUndefined();
    });
});
