import { isChunkLoadError } from './is-chunk-load-error';

describe('isChunkLoadError', () => {
    it.each([
        ['ChunkLoadError name', Object.assign(new Error('boom'), { name: 'ChunkLoadError' })],
        ['Loading chunk X failed', new Error('Loading chunk 42 failed.')],
        ['Loading CSS chunk X failed', new Error('Loading CSS chunk main failed.')],
        [
            'Failed to fetch dynamically imported module',
            new Error('Failed to fetch dynamically imported module: https://app/chunk.js'),
        ],
        ['error loading dynamically imported module', new Error('error loading dynamically imported module')],
        ['Importing a module script failed (Safari)', new Error('Importing a module script failed.')],
    ])('returns true for %s', (_label, err) => {
        expect(isChunkLoadError(err)).toBe(true);
    });

    it.each([
        ['null', null],
        ['undefined', undefined],
        ['string', 'Loading chunk 1 failed'],
        ['plain TypeError', new TypeError('Cannot read properties of undefined')],
        ['number', 42],
        ['object without name/message', { foo: 'bar' }],
    ])('returns false for %s', (_label, value) => {
        expect(isChunkLoadError(value)).toBe(false);
    });
});
