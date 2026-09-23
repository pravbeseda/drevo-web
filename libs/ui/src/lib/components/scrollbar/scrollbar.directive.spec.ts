import { createDirectiveFactory, SpectatorDirective } from '@ngneat/spectator/jest';
import { LoggerService } from '@drevo-web/core';
import { MockLoggerService, mockLoggerProvider } from '@drevo-web/core/testing';
import { expectObjectLike } from '@drevo-web/shared/testing';
import { OverlayScrollbars, PartialOptions } from 'overlayscrollbars';
import { ScrollbarDirective } from './scrollbar.directive';

jest.mock('overlayscrollbars', () => ({ OverlayScrollbars: jest.fn() }));

describe('ScrollbarDirective', () => {
    let spectator: SpectatorDirective<ScrollbarDirective>;
    const destroy = jest.fn();
    const createDirective = createDirectiveFactory({
        directive: ScrollbarDirective,
        providers: [mockLoggerProvider()],
    });

    const host = (): HTMLElement => spectator.query('[data-testid="scroll-area"]') as HTMLElement;

    /** Lets the library's lazy chunk resolve. */
    const loadLibrary = (): Promise<void> => new Promise(resolve => setTimeout(resolve));

    beforeEach(() => {
        jest.mocked(OverlayScrollbars)
            .mockReset()
            .mockReturnValue({ destroy } as unknown as OverlayScrollbars);
        destroy.mockReset();
    });

    const render = (): void => {
        spectator = createDirective(`<div uiScrollbar data-testid="scroll-area"></div>`);
    };

    it('should hide the native scrollbar before the custom one is drawn', () => {
        render();

        expect(host()).toHaveAttribute('data-overlayscrollbars-initialize');
    });

    it('should draw the scrollbar over the host itself, leaving its children in place', async () => {
        render();
        await loadLibrary();

        expect(OverlayScrollbars).toHaveBeenCalledTimes(1);
        expect(OverlayScrollbars).toHaveBeenCalledWith(
            { target: host(), elements: { viewport: host() } },
            expectObjectLike<PartialOptions>({
                scrollbars: expectObjectLike<NonNullable<PartialOptions['scrollbars']>>({
                    theme: 'ui-scrollbar',
                    autoHide: 'leave',
                    autoHideDelay: 200,
                    clickScroll: 'instant',
                }),
            }),
        );
    });

    it('should remove the scrollbar with the host', async () => {
        render();
        await loadLibrary();

        spectator.fixture.destroy();

        expect(destroy).toHaveBeenCalledTimes(1);
    });

    it('should draw nothing for a host destroyed before the library loads', async () => {
        render();
        spectator.fixture.destroy();

        await loadLibrary();

        expect(OverlayScrollbars).not.toHaveBeenCalled();
    });

    it('should log a scrollbar that fails to draw', async () => {
        const failure = new Error('boom');
        jest.mocked(OverlayScrollbars).mockImplementation(() => {
            throw failure;
        });
        render();

        await loadLibrary();

        const logger = (spectator.inject(LoggerService) as unknown as MockLoggerService).mockLogger;
        expect(logger.error).toHaveBeenCalledWith('Failed to draw the custom scrollbar', failure);
    });

    it('should give the native scrollbar back when the custom one fails to draw', async () => {
        jest.mocked(OverlayScrollbars).mockImplementation(() => {
            throw new Error('boom');
        });
        render();

        await loadLibrary();
        spectator.detectChanges();

        expect(host()).not.toHaveAttribute('data-overlayscrollbars-initialize');
    });
});
