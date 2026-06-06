import { sanitizeOnclickAttributes } from './sanitize-onclick-attributes';
import { stripMapElements } from './strip-map-elements';

describe('stripMapElements', () => {
    it('should return empty string for empty input', () => {
        expect(stripMapElements('')).toBe('');
    });

    it('should not modify HTML without map elements', () => {
        const html = '<div><p>Some content</p></div>';
        expect(stripMapElements(html)).toBe(html);
    });

    it('should remove div with class="map"', () => {
        const html = '<p>Before</p><div class="map">Map content</div><p>After</p>';
        expect(stripMapElements(html)).toBe('<p>Before</p><p>After</p>');
    });

    it('should remove self-closing element with class="map"', () => {
        const html = '<p>Before</p><br class="map"/><p>After</p>';
        expect(stripMapElements(html)).toBe('<p>Before</p><p>After</p>');
    });

    it('should remove map element with nested content', () => {
        const html = '<div class="map"><p>Nested <strong>content</strong></p></div>';
        expect(stripMapElements(html)).toBe('');
    });

    it('should remove multiple map elements', () => {
        const html = '<div class="map">First</div><p>Keep</p><span class="map">Second</span>';
        expect(stripMapElements(html)).toBe('<p>Keep</p>');
    });
});

describe('sanitizeOnclickAttributes', () => {
    it('should return empty string for empty input', () => {
        expect(sanitizeOnclickAttributes('')).toBe('');
    });

    it('should not modify HTML without onclick', () => {
        const html = '<div><a href="/test">Link</a></div>';
        expect(sanitizeOnclickAttributes(html)).toBe(html);
    });

    it('should convert double-quoted onclick to data-onclick', () => {
        const html = '<table onclick="javascript:toggleGroup(\'cmnt3\')"><tr><td>Text</td></tr></table>';
        expect(sanitizeOnclickAttributes(html)).toBe(
            '<table data-onclick="javascript:toggleGroup(\'cmnt3\')"><tr><td>Text</td></tr></table>',
        );
    });

    it('should convert single-quoted onclick to data-onclick', () => {
        const html = "<div onclick='javascript:toggleAll()'></div>";
        expect(sanitizeOnclickAttributes(html)).toBe("<div data-onclick='javascript:toggleAll()'></div>");
    });

    it('should not convert non-javascript onclick', () => {
        const html = '<div onclick="doSomething()"></div>';
        expect(sanitizeOnclickAttributes(html)).toBe(html);
    });

    it('should handle multiple onclick attributes in HTML', () => {
        const html = '<div onclick="javascript:toggleAll()"></div><span onclick="javascript:toggleRus()"></span>';
        expect(sanitizeOnclickAttributes(html)).toBe(
            '<div data-onclick="javascript:toggleAll()"></div><span data-onclick="javascript:toggleRus()"></span>',
        );
    });
});
