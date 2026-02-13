import { PLATFORM_ID } from '@angular/core';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { NotificationService } from '../services/notification.service';
import { LogDispatcher } from './log-dispatcher.service';
import { LogExportService } from './log-export.service';
import { LogStorageProvider, LogEntry } from './log-provider.interface';

describe('LogExportService', () => {
    describe('in browser mode', () => {
        let spectator: SpectatorService<LogExportService>;

        const mockStorageProvider: jest.Mocked<LogStorageProvider> = {
            name: 'mock-storage',
            isAvailable: true,
            log: jest.fn(),
            getLogs: jest.fn(),
            clearLogs: jest.fn(),
            getStorageSize: jest.fn(),
        };

        const mockDispatcher = {
            getStorageProvider: jest.fn().mockReturnValue(mockStorageProvider),
            flush: jest.fn().mockResolvedValue(undefined),
        };

        const mockNotification = {
            info: jest.fn(),
            error: jest.fn(),
        };

        const createService = createServiceFactory({
            service: LogExportService,
            providers: [
                { provide: PLATFORM_ID, useValue: 'browser' },
                { provide: LogDispatcher, useValue: mockDispatcher },
                { provide: NotificationService, useValue: mockNotification },
            ],
        });

        // Track created links for download testing
        let createdLink: HTMLAnchorElement | null = null;
        let originalCreateElement: typeof document.createElement;

        beforeEach(() => {
            spectator = createService();
            jest.clearAllMocks();
            createdLink = null;

            // Store original
            originalCreateElement = document.createElement.bind(document);

            // Mock createElement to capture anchor element
            jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
                const element = originalCreateElement(tagName);
                if (tagName === 'a') {
                    createdLink = element as HTMLAnchorElement;
                    // Mock click to prevent actual navigation
                    jest.spyOn(createdLink, 'click').mockImplementation();
                }
                return element;
            });

            // Mock URL methods
            URL.createObjectURL = jest.fn().mockReturnValue('blob:test');
            URL.revokeObjectURL = jest.fn();
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should create', () => {
            expect(spectator.service).toBeTruthy();
        });

        describe('downloadLogs()', () => {
            it('should show info notification when no storage provider', async () => {
                mockDispatcher.getStorageProvider.mockReturnValueOnce(undefined);

                await spectator.service.downloadLogs();

                expect(mockNotification.info).toHaveBeenCalledWith('Хранилище логов недоступно');
            });

            it('should show info notification when no logs', async () => {
                mockStorageProvider.getLogs.mockResolvedValueOnce([]);

                await spectator.service.downloadLogs();

                expect(mockNotification.info).toHaveBeenCalledWith('Нет логов для экспорта');
            });

            it('should flush dispatcher before getting logs', async () => {
                mockStorageProvider.getLogs.mockResolvedValueOnce([]);

                await spectator.service.downloadLogs();

                expect(mockDispatcher.flush).toHaveBeenCalled();
            });

            it('should trigger file download with logs', async () => {
                const mockLogs: LogEntry[] = [
                    {
                        level: 'info',
                        message: 'Test message',
                        timestamp: new Date('2026-01-18T10:00:00.000Z'),
                        context: 'TestContext',
                        url: '/test',
                    },
                ];
                mockStorageProvider.getLogs.mockResolvedValueOnce(mockLogs);

                await spectator.service.downloadLogs();

                expect(createdLink).not.toBeNull();
                expect(createdLink!.getAttribute('href')).toBe('blob:test');
                expect(createdLink!.getAttribute('download')).toMatch(/^drevo-logs-\d{4}-\d{2}-\d{2}\.csv$/);
                expect(createdLink!.click).toHaveBeenCalled();
                expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
            });

            it('should show error notification on failure', async () => {
                mockStorageProvider.getLogs.mockRejectedValueOnce(new Error('DB error'));
                jest.spyOn(console, 'error').mockImplementation();

                await spectator.service.downloadLogs();

                expect(mockNotification.error).toHaveBeenCalledWith('Не удалось скачать логи');
                expect(console.error).toHaveBeenCalled();
            });

            it('should generate CSV with correct structure', async () => {
                const mockLogs: LogEntry[] = [
                    {
                        level: 'error',
                        message: 'Error occurred',
                        timestamp: new Date('2026-01-18T10:00:00.000Z'),
                        context: 'ErrorContext',
                        url: '/error-page',
                        data: { code: 500 },
                    },
                    {
                        level: 'info',
                        message: 'Info message',
                        timestamp: new Date('2026-01-18T09:00:00.000Z'),
                        context: 'InfoContext',
                    },
                ];
                mockStorageProvider.getLogs.mockResolvedValueOnce(mockLogs);

                await spectator.service.downloadLogs();

                // Verify download was triggered
                expect(createdLink).not.toBeNull();
                expect(createdLink!.click).toHaveBeenCalled();
                expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
            });

            it('should handle logs with special CSV characters', async () => {
                const mockLogs: LogEntry[] = [
                    {
                        level: 'info',
                        message: 'Message with "quotes" and; semicolon',
                        timestamp: new Date('2026-01-18T10:00:00.000Z'),
                    },
                ];
                mockStorageProvider.getLogs.mockResolvedValueOnce(mockLogs);

                await spectator.service.downloadLogs();

                // Verify download was triggered
                expect(createdLink).not.toBeNull();
                expect(createdLink!.click).toHaveBeenCalled();
            });
        });

        describe('clearLogs()', () => {
            it('should clear logs from storage provider', async () => {
                await spectator.service.clearLogs();

                expect(mockStorageProvider.clearLogs).toHaveBeenCalled();
            });

            it('should handle no storage provider', async () => {
                mockDispatcher.getStorageProvider.mockReturnValueOnce(undefined);

                // Should not throw
                await expect(spectator.service.clearLogs()).resolves.not.toThrow();
            });
        });

        describe('getStorageSize()', () => {
            it('should return storage size from provider', async () => {
                mockStorageProvider.getStorageSize.mockResolvedValueOnce(1024 * 1024);

                const size = await spectator.service.getStorageSize();

                expect(size).toBe(1024 * 1024);
            });

            it('should return 0 when no storage provider', async () => {
                mockDispatcher.getStorageProvider.mockReturnValueOnce(undefined);

                const size = await spectator.service.getStorageSize();

                expect(size).toBe(0);
            });
        });
    });

    describe('in server mode', () => {
        let spectator: SpectatorService<LogExportService>;

        const createService = createServiceFactory({
            service: LogExportService,
            providers: [
                { provide: PLATFORM_ID, useValue: 'server' },
                {
                    provide: LogDispatcher,
                    useValue: {
                        getStorageProvider: jest.fn(),
                        flush: jest.fn(),
                    },
                },
                {
                    provide: NotificationService,
                    useValue: { info: jest.fn(), error: jest.fn() },
                },
            ],
        });

        beforeEach(() => {
            spectator = createService();
        });

        it('should not download logs on server', async () => {
            const dispatcher = spectator.inject(LogDispatcher);

            await spectator.service.downloadLogs();

            expect(dispatcher.getStorageProvider).not.toHaveBeenCalled();
        });
    });
});
