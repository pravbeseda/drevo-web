import { ClipboardService } from './clipboard.service';
import { WINDOW } from '@drevo-web/core';
import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';

describe('ClipboardService', () => {
    describe('with the Clipboard API', () => {
        const writeText = jest.fn<Promise<void>, [string]>();
        let spectator: SpectatorService<ClipboardService>;

        const createService = createServiceFactory({
            service: ClipboardService,
            providers: [{ provide: WINDOW, useValue: { navigator: { clipboard: { writeText } } } }],
        });

        beforeEach(() => {
            writeText.mockReset();
            spectator = createService();
        });

        it('should write the text and complete once the browser has it', async () => {
            writeText.mockResolvedValue(undefined);
            const completed = jest.fn();

            spectator.service.copy('текст').subscribe({ complete: completed });
            await Promise.resolve();

            expect(writeText).toHaveBeenCalledWith('текст');
            expect(completed).toHaveBeenCalled();
        });

        it('should fail when the browser refuses the write', async () => {
            const refusal = new Error('denied');
            writeText.mockRejectedValue(refusal);
            let error: unknown;

            spectator.service.copy('текст').subscribe({ error: (err: unknown) => (error = err) });
            await Promise.resolve();
            await Promise.resolve();

            expect(error).toBe(refusal);
        });
    });

    describe('without the Clipboard API', () => {
        const createService = createServiceFactory({
            service: ClipboardService,
            providers: [{ provide: WINDOW, useValue: { navigator: {} } }],
        });

        it('should fail at once rather than throw', () => {
            const spectator = createService();
            let error: unknown;

            spectator.service.copy('текст').subscribe({ error: (err: unknown) => (error = err) });

            expect(error).toEqual(new Error('Clipboard API unavailable'));
        });
    });
});
