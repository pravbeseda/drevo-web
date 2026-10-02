import { formatKeyBinding, isMacPlatform } from './key-binding';

describe('isMacPlatform', () => {
    it.each([
        ['Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)', true],
        ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', true],
        ['Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', true],
        ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', false],
        ['Mozilla/5.0 (X11; Linux x86_64)', false],
    ])('reads %s as a Mac: %s', (userAgent, expected) => {
        expect(isMacPlatform({ navigator: { userAgent } } as Window)).toBe(expected);
    });

    it('takes a render without a window for a non-Mac one', () => {
        expect(isMacPlatform(undefined)).toBe(false);
    });
});

describe('formatKeyBinding', () => {
    it('spells Mod as ⌘ and drops the dashes on a Mac', () => {
        expect(formatKeyBinding('Mod-Shift-Enter', true)).toBe('⌘ShiftEnter');
    });

    it('spells Mod as Ctrl and joins the keys with + elsewhere', () => {
        expect(formatKeyBinding('Mod-Shift-Enter', false)).toBe('Ctrl+Shift+Enter');
    });
});
