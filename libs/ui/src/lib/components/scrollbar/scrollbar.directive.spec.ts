import { createDirectiveFactory, SpectatorDirective } from '@ngneat/spectator/jest';
import { LoggerService } from '@drevo-web/core';
import { MockLoggerService, mockLoggerProvider } from '@drevo-web/core/testing';
import { expectObjectLike } from '@drevo-web/shared/testing';
import { InitializationTargetObject, OverlayScrollbars, PartialOptions } from 'overlayscrollbars';
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

    /** The slot the directive handed to the library, as the library received it. */
    const slot = (): HTMLElement => {
        const [target] = jest.mocked(OverlayScrollbars).mock.calls[0];
        return (target as InitializationTargetObject).scrollbars?.slot as HTMLElement;
    };

    const withVisibleHeight = (height: number): OverlayScrollbars =>
        ({ state: () => ({ overflowEdge: { x: 0, y: height } }) }) as unknown as OverlayScrollbars;

    /** Fires one of the listeners the directive handed to the library. */
    const emit = (event: 'initialized' | 'updated', instance: OverlayScrollbars, args?: unknown): void => {
        const listeners = jest.mocked(OverlayScrollbars).mock.calls[0][2] as Record<
            string,
            (instance: OverlayScrollbars, args?: unknown) => void
        >;
        listeners[event](instance, args);
    };

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
            { target: host(), elements: { viewport: host() }, scrollbars: { slot: slot() } },
            expectObjectLike<PartialOptions>({
                scrollbars: expectObjectLike<NonNullable<PartialOptions['scrollbars']>>({
                    theme: 'ui-scrollbar',
                    autoHide: 'leave',
                    autoHideDelay: 200,
                    clickScroll: 'instant',
                }),
            }),
            expect.anything(),
        );
    });

    /**
     * A bar drawn straight into the host scrolls with the content and is moved
     * back by the scroll offset, so it holds the scrolled-to height open after
     * the content shrinks; the slot sticks to the visible area instead.
     */
    it('should draw the bars in a slot that opens the host', async () => {
        render();
        await loadLibrary();

        expect(slot()).toHaveClass('ui-scrollbar-slot');
        expect(host().firstElementChild).toBe(slot());
    });

    it('should size the slot to the visible height of the host, taking no room in it', async () => {
        render();
        await loadLibrary();

        emit('initialized', withVisibleHeight(300));

        expect(slot().style.height).toBe('300px');
        expect(slot().style.marginBottom).toBe('-300px');
    });

    it('should follow the visible height of the host when it changes', async () => {
        render();
        await loadLibrary();
        emit('initialized', withVisibleHeight(300));

        emit('updated', withVisibleHeight(450), { updateHints: { overflowEdgeChanged: true } });

        expect(slot().style.height).toBe('450px');
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
