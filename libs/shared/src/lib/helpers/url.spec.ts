import { isValidReturnUrl } from './url';

describe('isValidReturnUrl', () => {
    describe('valid URLs', () => {
        it('should accept root path', () => {
            expect(isValidReturnUrl('/')).toBe(true);
        });

        it('should accept simple relative paths', () => {
            expect(isValidReturnUrl('/dashboard')).toBe(true);
            expect(isValidReturnUrl('/articles')).toBe(true);
            expect(isValidReturnUrl('/login')).toBe(true);
        });

        it('should accept nested paths', () => {
            expect(isValidReturnUrl('/articles/123')).toBe(true);
            expect(isValidReturnUrl('/user/profile/settings')).toBe(true);
        });

        it('should accept paths with query parameters', () => {
            expect(isValidReturnUrl('/search?q=test')).toBe(true);
            expect(isValidReturnUrl('/articles?page=2&sort=date')).toBe(true);
        });

        it('should accept paths with hash fragments', () => {
            expect(isValidReturnUrl('/articles#section-1')).toBe(true);
            expect(isValidReturnUrl('/docs/guide#installation')).toBe(true);
        });
    });

    describe('invalid URLs - Open Redirect attacks', () => {
        it('should reject protocol-relative URLs', () => {
            expect(isValidReturnUrl('//evil.com')).toBe(false);
            expect(isValidReturnUrl('//evil.com/path')).toBe(false);
        });

        it('should reject IE-specific backslash bypass', () => {
            expect(isValidReturnUrl('/\\evil.com')).toBe(false);
        });

        it('should reject javascript: protocol', () => {
            expect(isValidReturnUrl('javascript:alert(1)')).toBe(false);
            expect(isValidReturnUrl('JavaScript:alert(1)')).toBe(false);
            expect(isValidReturnUrl('JAVASCRIPT:alert(1)')).toBe(false);
        });

        it('should reject data: protocol', () => {
            expect(
                isValidReturnUrl('data:text/html,<script>alert(1)</script>')
            ).toBe(false);
        });

        it('should reject vbscript: protocol', () => {
            expect(isValidReturnUrl('vbscript:msgbox(1)')).toBe(false);
        });

        it('should reject http/https absolute URLs', () => {
            expect(isValidReturnUrl('http://evil.com')).toBe(false);
            expect(isValidReturnUrl('https://evil.com')).toBe(false);
            expect(isValidReturnUrl('HTTP://EVIL.COM')).toBe(false);
        });

        it('should reject ftp: protocol', () => {
            expect(isValidReturnUrl('ftp://server.com')).toBe(false);
        });
    });

    describe('invalid URLs - edge cases', () => {
        it('should reject empty string', () => {
            expect(isValidReturnUrl('')).toBe(false);
        });

        it('should reject null/undefined', () => {
            expect(isValidReturnUrl(null as unknown as string)).toBe(false);
            expect(isValidReturnUrl(undefined as unknown as string)).toBe(
                false
            );
        });

        it('should reject relative paths without leading slash', () => {
            expect(isValidReturnUrl('dashboard')).toBe(false);
            expect(isValidReturnUrl('articles/123')).toBe(false);
        });
    });
});
