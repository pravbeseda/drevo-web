import { escapeHtml } from './html';

describe('escapeHtml', () => {
    it('escapes every character that can open markup', () => {
        expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
    });

    it('escapes the ampersand before the entity it introduces', () => {
        expect(escapeHtml('&lt;')).toBe('&amp;lt;');
    });

    it('leaves text without special characters untouched', () => {
        expect(escapeHtml('Древо — свободная энциклопедия')).toBe('Древо — свободная энциклопедия');
    });

    it('returns an empty string unchanged', () => {
        expect(escapeHtml('')).toBe('');
    });

    it('escapes every occurrence, not only the first', () => {
        expect(escapeHtml('<b><i>')).toBe('&lt;b&gt;&lt;i&gt;');
    });
});
