import { PLATFORM_ID } from '@angular/core';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { LogDispatcher, LOG_PRODUCTION_MODE, LOG_PROVIDERS } from './log-dispatcher.service';
import { LogProvider, LogEntry } from './log-provider.interface';

describe('LogDispatcher', () => {
    const createMockProvider = (name: string, isAvailable = true): jest.Mocked<LogProvider> => ({
        name,
        isAvailable,
        log: jest.fn(),
        flush: jest.fn().mockResolvedValue(undefined),
    });

    describe('in browser mode', () => {
        let spectator: SpectatorService<LogDispatcher>;

        const createService = createServiceFactory({
            service: LogDispatcher,
            providers: [
                { provide: PLATFORM_ID, useValue: 'browser' },
                { provide: LOG_PRODUCTION_MODE, useValue: false },
            ],
        });

        beforeEach(() => {
            spectator = createService();
        });

        it('should create', () => {
            expect(spectator.service).toBeTruthy();
        });

        it('should have console provider by default', () => {
            const providers = spectator.service.getProviders();
            expect(providers.some(p => p.name === 'console')).toBe(true);
        });

        it('should register custom providers', () => {
            const mockProvider = createMockProvider('test');
            spectator.service.registerProvider(mockProvider);

            const providers = spectator.service.getProviders();
            expect(providers.some(p => p.name === 'test')).toBe(true);
        });

        it('should not register duplicate providers', () => {
            const mockProvider = createMockProvider('test');
            spectator.service.registerProvider(mockProvider);
            spectator.service.registerProvider(mockProvider);

            const providers = spectator.service.getProviders();
            const testProviders = providers.filter(p => p.name === 'test');
            expect(testProviders.length).toBe(1);
        });

        it('should unregister providers', () => {
            const mockProvider = createMockProvider('test');
            spectator.service.registerProvider(mockProvider);
            spectator.service.unregisterProvider('test');

            const providers = spectator.service.getProviders();
            expect(providers.some(p => p.name === 'test')).toBe(false);
        });

        it('should dispatch to all available providers', () => {
            const mockProvider = createMockProvider('test');
            spectator.service.registerProvider(mockProvider);

            spectator.service.dispatch('info', 'Test message', 'TestContext', {
                key: 'value',
            });

            expect(mockProvider.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'info',
                    message: 'Test message',
                    context: 'TestContext',
                })
            );
        });

        it('should not dispatch to unavailable providers', () => {
            const mockProvider = createMockProvider('test', false);
            spectator.service.registerProvider(mockProvider);

            spectator.service.dispatch('info', 'Test message');

            expect(mockProvider.log).not.toHaveBeenCalled();
        });

        it('should sanitize sensitive data before dispatching', () => {
            const mockProvider = createMockProvider('test');
            spectator.service.registerProvider(mockProvider);

            spectator.service.dispatch('info', 'Login', 'Auth', {
                password: 'secret',
            });

            expect(mockProvider.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { password: '[REDACTED]' },
                })
            );
        });

        it('should include timestamp in log entries', () => {
            const mockProvider = createMockProvider('test');
            spectator.service.registerProvider(mockProvider);
            const before = new Date();

            spectator.service.dispatch('info', 'Test message');

            const after = new Date();
            const call = mockProvider.log.mock.calls[0][0] as LogEntry;
            expect(call.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(call.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        it('should include URL in log entries', () => {
            const mockProvider = createMockProvider('test');
            spectator.service.registerProvider(mockProvider);

            spectator.service.dispatch('info', 'Test message');

            expect(mockProvider.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: expect.any(String),
                })
            );
        });

        it('should flush all providers with flush method', async () => {
            const mockProvider = createMockProvider('test');
            spectator.service.registerProvider(mockProvider);

            await spectator.service.flush();

            expect(mockProvider.flush).toHaveBeenCalled();
        });

        it('should handle provider errors gracefully', () => {
            const errorProvider = createMockProvider('error');
            errorProvider.log.mockImplementation(() => {
                throw new Error('Provider error');
            });
            spectator.service.registerProvider(errorProvider);

            jest.spyOn(console, 'error').mockImplementation();

            // Should not throw
            expect(() => spectator.service.dispatch('info', 'Test')).not.toThrow();

            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('LogDispatcher: Error in provider'),
                expect.any(Error)
            );

            jest.restoreAllMocks();
        });
    });

    describe('in server mode', () => {
        let spectator: SpectatorService<LogDispatcher>;

        const createService = createServiceFactory({
            service: LogDispatcher,
            providers: [
                { provide: PLATFORM_ID, useValue: 'server' },
                { provide: LOG_PRODUCTION_MODE, useValue: false },
            ],
        });

        beforeEach(() => {
            spectator = createService();
        });

        it('should create', () => {
            expect(spectator.service).toBeTruthy();
        });

        it('should have console provider but it is not available', () => {
            const providers = spectator.service.getProviders();
            const consoleProvider = providers.find(p => p.name === 'console');
            expect(consoleProvider).toBeDefined();
            expect(consoleProvider?.isAvailable).toBe(false);
        });

        it('should not dispatch to console on server', () => {
            const mockProvider = createMockProvider('test', false);
            spectator.service.registerProvider(mockProvider);

            spectator.service.dispatch('info', 'Test message');

            expect(mockProvider.log).not.toHaveBeenCalled();
        });
    });

    describe('with injected providers', () => {
        const injectedProvider: LogProvider = {
            name: 'injected',
            isAvailable: true,
            log: jest.fn(),
            flush: jest.fn().mockResolvedValue(undefined),
        };

        let spectator: SpectatorService<LogDispatcher>;

        const createServiceWithInjected = createServiceFactory({
            service: LogDispatcher,
            providers: [
                { provide: PLATFORM_ID, useValue: 'browser' },
                { provide: LOG_PRODUCTION_MODE, useValue: false },
                { provide: LOG_PROVIDERS, useValue: [injectedProvider] },
            ],
        });

        beforeEach(() => {
            spectator = createServiceWithInjected();
        });

        it('should include injected providers', () => {
            const providers = spectator.service.getProviders();
            expect(providers.some(p => p.name === 'injected')).toBe(true);
        });
    });
});
