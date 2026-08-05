import { createPictureMarkerRegex } from './wiki-patterns';

describe('createPictureMarkerRegex', () => {
    it('should match a picture marker and capture its id', () => {
        const match = createPictureMarkerRegex().exec('text @123@ more');

        expect(match?.[1]).toBe('123');
    });

    it('should keep the sign of a negative marker in the capture', () => {
        const match = createPictureMarkerRegex().exec('text @-123@ more');

        expect(match?.[1]).toBe('-123');
    });

    it('should return an instance whose lastIndex is independent of previous calls', () => {
        const first = createPictureMarkerRegex();
        first.exec('@1@ @2@');

        const second = createPictureMarkerRegex();

        expect(second.lastIndex).toBe(0);
        expect(second.exec('@1@ @2@')?.[1]).toBe('1');
    });
});
