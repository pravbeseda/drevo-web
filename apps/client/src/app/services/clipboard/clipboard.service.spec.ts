import { ClipboardService, CopyFeedback } from './clipboard.service';
import { LoggerService, NotificationService, WINDOW } from '@drevo-web/core';
import { MockLoggerService, mockLoggerProvider } from '@drevo-web/core/testing';
import { SpectatorService, createServiceFactory, mockProvider } from '@ngneat/spectator/jest';

const FEEDBACK: CopyFeedback = { success: 'Ссылка скопирована', failure: 'Не удалось скопировать ссылку' };

// The write resolves or rejects on a later microtask.
const settle = async (): Promise<void> => {
    await Promise.resolve();
    await Promise.resolve();
};

describe('ClipboardService', () => {
    describe('with the Clipboard API', () => {
        const writeText = jest.fn<Promise<void>, [string]>();
        let spectator: SpectatorService<ClipboardService>;

        const createService = createServiceFactory({
            service: ClipboardService,
            providers: [
                mockLoggerProvider(),
                mockProvider(NotificationService),
                { provide: WINDOW, useValue: { navigator: { clipboard: { writeText } } } },
            ],
        });

        const logger = (): MockLoggerService['mockLogger'] =>
            (spectator.inject(LoggerService) as unknown as MockLoggerService).mockLogger;

        beforeEach(() => {
            writeText.mockReset();
            spectator = createService();
        });

        it('should write the text and say so once the browser has it', async () => {
            writeText.mockResolvedValue(undefined);

            spectator.service.copy('текст', FEEDBACK);
            await settle();

            expect(writeText).toHaveBeenCalledWith('текст');
            expect(spectator.inject(NotificationService).success).toHaveBeenCalledWith('Ссылка скопирована');
            expect(logger().info).toHaveBeenCalledWith('Text copied', { text: 'текст' });
        });

        it('should report and log a write the browser refuses', async () => {
            const refusal = new Error('denied');
            writeText.mockRejectedValue(refusal);

            spectator.service.copy('текст', FEEDBACK);
            await settle();

            expect(spectator.inject(NotificationService).error).toHaveBeenCalledWith('Не удалось скопировать ссылку');
            expect(logger().error).toHaveBeenCalledWith('Copy failed', refusal);
        });
    });

    describe('without the Clipboard API', () => {
        const createService = createServiceFactory({
            service: ClipboardService,
            providers: [
                mockLoggerProvider(),
                mockProvider(NotificationService),
                { provide: WINDOW, useValue: { navigator: {} } },
            ],
        });

        it('should report a failure at once rather than throw', () => {
            const spectator = createService();

            expect(() => spectator.service.copy('текст', FEEDBACK)).not.toThrow();
            expect(spectator.inject(NotificationService).error).toHaveBeenCalledWith('Не удалось скопировать ссылку');
        });
    });
});
