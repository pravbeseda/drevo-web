import { sanitizeLogData, sanitizeLogEntry } from './log-sanitizer';

describe('LogSanitizer', () => {
    describe('sanitizeLogData', () => {
        it('should return undefined as is', () => {
            expect(sanitizeLogData(undefined)).toBeUndefined();
        });

        it('should return primitives as is', () => {
            expect(sanitizeLogData('hello')).toBe('hello');
            expect(sanitizeLogData(123)).toBe(123);
            expect(sanitizeLogData(true)).toBe(true);
        });

        it('should return Date as is', () => {
            const date = new Date();
            expect(sanitizeLogData(date)).toBe(date);
        });

        it('should convert Error to plain object', () => {
            const error = new Error('Test error');
            const result = sanitizeLogData(error) as {
                name: string;
                message: string;
                stack?: string;
            };

            expect(result.name).toBe('Error');
            expect(result.message).toBe('Test error');
            expect(result.stack).toBeDefined();
        });

        it('should sanitize arrays', () => {
            const data = [{ password: 'secret' }, 'normal'];
            const result = sanitizeLogData(data);

            expect(result).toEqual([{ password: '[REDACTED]' }, 'normal']);
        });

        it('should redact password fields', () => {
            const data = { password: 'secret123', username: 'user' };
            const result = sanitizeLogData(data);

            expect(result).toEqual({
                password: '[REDACTED]',
                username: 'user',
            });
        });

        it('should redact token fields', () => {
            const data = { accessToken: 'abc123', refreshToken: 'xyz789' };
            const result = sanitizeLogData(data);

            expect(result).toEqual({
                accessToken: '[REDACTED]',
                refreshToken: '[REDACTED]',
            });
        });

        it('should redact authorization headers', () => {
            const data = {
                Authorization: 'Bearer xyz',
                'Content-Type': 'json',
            };
            const result = sanitizeLogData(data);

            expect(result).toEqual({
                Authorization: '[REDACTED]',
                'Content-Type': 'json',
            });
        });

        it('should redact api_key and apiKey fields', () => {
            const data = { api_key: 'key1', apiKey: 'key2', apikey: 'key3' };
            const result = sanitizeLogData(data);

            expect(result).toEqual({
                api_key: '[REDACTED]',
                apiKey: '[REDACTED]',
                apikey: '[REDACTED]',
            });
        });

        it('should redact secret fields', () => {
            const data = { clientSecret: 'secret', publicKey: 'public' };
            const result = sanitizeLogData(data);

            expect(result).toEqual({
                clientSecret: '[REDACTED]',
                publicKey: 'public',
            });
        });

        it('should redact nested sensitive fields', () => {
            const data = {
                user: {
                    name: 'John',
                    auth: {
                        password: 'secret',
                        token: 'abc',
                    },
                },
            };
            const result = sanitizeLogData(data);

            expect(result).toEqual({
                user: {
                    name: 'John',
                    auth: {
                        password: '[REDACTED]',
                        token: '[REDACTED]',
                    },
                },
            });
        });

        it('should handle deep nesting up to max depth', () => {
            let data: Record<string, unknown> = { value: 'test' };
            for (let i = 0; i < 15; i++) {
                data = { nested: data };
            }

            const result = sanitizeLogData(data);
            // Should not throw and should truncate at max depth
            expect(result).toBeDefined();
        });

        it('should be case insensitive for sensitive patterns', () => {
            const data = {
                PASSWORD: 'secret',
                Token: 'abc',
                AUTHORIZATION: 'xyz',
            };
            const result = sanitizeLogData(data);

            expect(result).toEqual({
                PASSWORD: '[REDACTED]',
                Token: '[REDACTED]',
                AUTHORIZATION: '[REDACTED]',
            });
        });
    });

    describe('sanitizeLogEntry', () => {
        it('should return entry unchanged if no data', () => {
            const entry = {
                level: 'info' as const,
                message: 'test',
                timestamp: new Date(),
            };

            const result = sanitizeLogEntry(entry);

            expect(result).toEqual(entry);
        });

        it('should sanitize data field', () => {
            const entry = {
                level: 'info' as const,
                message: 'test',
                timestamp: new Date(),
                data: { password: 'secret' },
            };

            const result = sanitizeLogEntry(entry);

            expect(result.data).toEqual({ password: '[REDACTED]' });
        });

        it('should preserve other fields', () => {
            const entry = {
                level: 'error' as const,
                message: 'error message',
                context: 'TestContext',
                timestamp: new Date(),
                url: '/test',
                data: { token: 'abc' },
            };

            const result = sanitizeLogEntry(entry);

            expect(result.level).toBe('error');
            expect(result.message).toBe('error message');
            expect(result.context).toBe('TestContext');
            expect(result.url).toBe('/test');
            expect(result.data).toEqual({ token: '[REDACTED]' });
        });
    });
});
