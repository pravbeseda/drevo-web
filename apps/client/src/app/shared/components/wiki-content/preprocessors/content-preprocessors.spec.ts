import { resolveFragmentLinks } from './resolve-fragment-links';
import { sanitizeOnclickAttributes } from './sanitize-onclick-attributes';
import { stripMapElements } from './strip-map-elements';

// A rescan-per-opener implementation costs ~160x a document of the same shape that holds no
// map elements; the single-pass one stays under 3x. Compared as a ratio rather than a
// wall-clock budget, matching wiki-highlighter.service.spec.ts: an absolute bound encodes the
// machine it was tuned on, and nothing keeps the two ends of it apart on a slower runner.
const RESCAN_RATIO = 10;
// Floor for the ratio, so a sub-millisecond baseline cannot make the comparison fire on noise.
const SCAN_FLOOR_MS = 20;

function elapsed(run: () => void): number {
    const started = performance.now();
    run();
    return performance.now() - started;
}

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

    it('should remove map element with attributes longer than any fixed scan window', () => {
        const longStyle = `style="${'a:b;'.repeat(200)}"`;
        const html = `<p>Before</p><div ${longStyle} class="map">Map content</div><p>After</p>`;
        expect(stripMapElements(html)).toBe('<p>Before</p><p>After</p>');
    });

    it('should remove map element with a long attribute after the class', () => {
        const longData = `data-x="${'y'.repeat(800)}"`;
        const html = `<div class="map" ${longData}>Map content</div><p>Keep</p>`;
        expect(stripMapElements(html)).toBe('<p>Keep</p>');
    });

    it('should remove self-closing map element with long attributes', () => {
        const longStyle = `style="${'a:b;'.repeat(200)}"`;
        const html = `<p>Before</p><br ${longStyle} class="map"/><p>After</p>`;
        expect(stripMapElements(html)).toBe('<p>Before</p><p>After</p>');
    });

    it('should leave an unclosed map element untouched', () => {
        const html = '<p>Before</p><div class="map">Map content';
        expect(stripMapElements(html)).toBe(html);
    });

    it('should not strip elements whose class merely contains "map"', () => {
        const html = '<div class="roadmap">Keep</div>';
        expect(stripMapElements(html)).toBe(html);
    });

    it('should not stop at a nested closing tag that merely starts with the same name', () => {
        const html = '<a class="map"><abbr>inside</abbr><em>still map</em></a>';
        expect(stripMapElements(html)).toBe('');
    });

    it('should keep offsets correct when attributes contain characters that change length when lowercased', () => {
        const html = '<div data-x="İİİİ" class="map">Map content</div><p>After</p>';
        expect(stripMapElements(html)).toBe('<p>After</p>');
    });

    it('should match the closing tag case-insensitively', () => {
        const html = '<DIV class="map">Map content</DIV><p>After</p>';
        expect(stripMapElements(html)).toBe('<p>After</p>');
    });

    // Verbatim shape emitted by legacy-drevo-yii MapRule.php: a `<table class="map">`
    // wrapping divs and uls, with no nested table and exactly one class.
    it('should remove the map block the legacy formatter actually emits', () => {
        const mapBlock =
            '<!--noindex--><table class="map"><tr><td>' +
            '<div style="float: left;"><div id="yandexMap" class="hidden"></div><ul id="Yamenu"></ul></div>' +
            '<div style="float: left;"><div id="map_canvas"></div><ul id="glinks"></ul></div>' +
            '</td></tr></table><!--/noindex-->';
        const html = `<p>Текст</p>${mapBlock}<p>Ещё</p>`;

        expect(stripMapElements(html)).toBe('<p>Текст</p><!--noindex--><!--/noindex--><p>Ещё</p>');
    });

    // A stray closing tag reaches `bypassSecurityTrustHtml`, where it can lift the rest of
    // the article out of its container, so nesting is matched by depth rather than by the
    // first same-name closer.
    it('should remove the whole map element when its content nests a same-name element', () => {
        const html = '<div class="map"><div>x</div></div>';
        expect(stripMapElements(html)).toBe('');
    });

    it('should remove the whole map element across several levels of same-name nesting', () => {
        const html = '<p>Before</p><div class="map"><div><div>x</div></div></div><p>After</p>';
        expect(stripMapElements(html)).toBe('<p>Before</p><p>After</p>');
    });

    it('should leave a map element whose nesting is never balanced', () => {
        const html = '<p>Before</p><div class="map"><div>x</div>';
        expect(stripMapElements(html)).toBe(html);
    });

    // Depth is tracked per tag name rather than on one shared stack. Legacy wiki HTML is not
    // reliably balanced, and a shared stack would let any unclosed tag inside the block —
    // a `<div>`, a `<td>` — swallow the `</table>` and leak the whole map into the article.
    it.each([
        ['an unclosed inner div', '<table class="map"><tr><td><div style="float: left;"><ul></ul></td></tr></table>'],
        ['a stray closing div', '<table class="map"><tr><td></div><ul></ul></td></tr></table>'],
        ['unclosed td and tr', '<table class="map"><tr><td><div>x</div></table>'],
        ['a balanced nested table', '<table class="map"><tr><td><table><tr><td>x</td></tr></table></td></tr></table>'],
    ])('should remove a map table containing %s', (_name, mapBlock) => {
        const html = `<p>Before</p>${mapBlock}<p>After</p>`;

        expect(stripMapElements(html)).toBe('<p>Before</p><p>After</p>');
    });

    it('should remove the legacy map block when one of its inner divs is unclosed', () => {
        const mapBlock =
            '<!--noindex--><table class="map"><tr><td>' +
            '<div style="float: left;"><div id="yandexMap" class="hidden"><ul id="Yamenu"></ul></div>' +
            '<div style="float: left;"><div id="map_canvas"></div><ul id="glinks"></ul></div>' +
            '</td></tr></table><!--/noindex-->';
        const html = `<p>Текст</p>${mapBlock}<p>Ещё</p>`;

        expect(stripMapElements(html)).toBe('<p>Текст</p><!--noindex--><!--/noindex--><p>Ещё</p>');
    });

    // Documented boundary, matching the previous regex: the formatter never emits it.
    it('should leave a map element carrying more than one class', () => {
        const html = '<div class="map wide">Keep</div>';
        expect(stripMapElements(html)).toBe(html);
    });

    // Baseline is the same tag count and byte length with a class the stripper ignores, so
    // only the map handling differs between the two measurements.
    it.each([
        ['unclosed map tags', ''],
        ['unclosed map tags followed by a single closer', '</div>'],
    ])('should handle many %s without a rescan per opener', (_name, suffix) => {
        const tags = 16000;
        const pathological = `${'<div class="map">'.repeat(tags)}${suffix}`;
        const benign = `${'<div class="nap">'.repeat(tags)}${suffix}`;

        stripMapElements(benign);

        const benignMs = elapsed(() => stripMapElements(benign));
        const pathologicalMs = elapsed(() => stripMapElements(pathological));

        expect(pathologicalMs).toBeLessThan(Math.max(benignMs * RESCAN_RATIO, SCAN_FLOOR_MS));
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

describe('resolveFragmentLinks', () => {
    const basePath = '/articles/123';

    it('should return empty string for empty input', () => {
        expect(resolveFragmentLinks('', basePath)).toBe('');
    });

    it('should return content unchanged when basePath is empty', () => {
        const html = '<a href="#fn5">5</a>';
        expect(resolveFragmentLinks(html, '')).toBe(html);
    });

    it('should prepend basePath to a fragment-only link', () => {
        expect(resolveFragmentLinks('<a href="#fn5">5</a>', basePath)).toBe('<a href="/articles/123#fn5">5</a>');
    });

    it('should preserve single quotes', () => {
        expect(resolveFragmentLinks("<a href='#fn5'>5</a>", basePath)).toBe("<a href='/articles/123#fn5'>5</a>");
    });

    it('should rewrite multiple fragment links', () => {
        const html = '<a href="#fn5">5</a> text <a href="#ref5">back</a>';
        expect(resolveFragmentLinks(html, basePath)).toBe(
            '<a href="/articles/123#fn5">5</a> text <a href="/articles/123#ref5">back</a>',
        );
    });

    it('should not touch bare hash links', () => {
        const html = '<a href="#">toggle</a>';
        expect(resolveFragmentLinks(html, basePath)).toBe(html);
    });

    it('should not touch absolute or external links', () => {
        const html = '<a href="/articles/456">link</a><a href="https://example.com#x">ext</a>';
        expect(resolveFragmentLinks(html, basePath)).toBe(html);
    });
});
