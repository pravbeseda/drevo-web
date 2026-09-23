import { createDirectiveFactory, SpectatorDirective } from '@ngneat/spectator/jest';
import { StorageService } from '@drevo-web/core';
import { ResizeHandleDirective } from './resize-handle.directive';

const STORAGE_KEY = 'test-size';
const PARENT_SIZE = 1000;
const PANE_SIZE = 300;
const MIN_SIZE = 200;
/** `max-*: 70%` of the parent. */
const MAX_SIZE = 700;

describe('ResizeHandleDirective', () => {
    let spectator: SpectatorDirective<ResizeHandleDirective>;
    const createDirective = createDirectiveFactory({
        directive: ResizeHandleDirective,
        mocks: [StorageService],
    });

    const pane = (): HTMLElement => spectator.query('[data-testid="pane"]') as HTMLElement;
    const handle = (): HTMLElement => spectator.query('[data-testid="handle"]') as HTMLElement;
    const paneSize = (): string => pane().style.getPropertyValue('--ui-resize-size');
    const measurePane = (size: number): void => {
        jest.spyOn(pane(), 'getBoundingClientRect').mockReturnValue({ width: size, height: size } as DOMRect);
    };

    /** Lays the panes out the way a browser would, since jsdom measures nothing. */
    const render = ({
        orientation = 'horizontal',
        storageKey = STORAGE_KEY,
        stored,
        initialPaneSize = PANE_SIZE,
    }: {
        readonly orientation?: 'horizontal' | 'vertical';
        readonly storageKey?: string;
        readonly stored?: number;
        /** What the target measures when the handle first renders — 0 while a layout hides it. */
        readonly initialPaneSize?: number;
    } = {}): void => {
        const [min, max] = orientation === 'horizontal' ? ['min-width', 'max-width'] : ['min-height', 'max-height'];
        spectator = createDirective(
            `<div data-testid="parent">
                <div #pane data-testid="pane" style="${min}: ${MIN_SIZE}px; ${max}: 70%"></div>
                <div
                    data-testid="handle"
                    [uiResizeHandle]="pane"
                    orientation="${orientation}"
                    ${storageKey ? `storageKey="${storageKey}"` : ''}
                ></div>
            </div>`,
            { detectChanges: false },
        );
        const parent = spectator.query('[data-testid="parent"]') as HTMLElement;
        Object.defineProperty(parent, orientation === 'horizontal' ? 'clientWidth' : 'clientHeight', {
            value: PARENT_SIZE,
        });
        measurePane(initialPaneSize);
        handle().setPointerCapture = jest.fn();
        handle().releasePointerCapture = jest.fn();
        spectator.inject(StorageService).get.mockReturnValue(stored);
        spectator.detectChanges();
    };

    const drag = (from: number, to: number, axis: 'x' | 'y' = 'x'): void => {
        const at = (position: number): [number, number] => (axis === 'x' ? [position, 0] : [0, position]);
        spectator.dispatchMouseEvent(handle(), 'pointerdown', ...at(from));
        spectator.dispatchMouseEvent(handle(), 'pointermove', ...at(to));
        spectator.dispatchMouseEvent(handle(), 'pointerup', ...at(to));
    };

    it('should present itself as a focusable separator between side-by-side panes', () => {
        render();

        expect(handle()).toHaveAttribute('role', 'separator');
        expect(handle()).toHaveAttribute('aria-orientation', 'vertical');
        expect(handle()).toHaveAttribute('tabindex', '0');
    });

    it('should resize the target by the distance dragged', () => {
        render();

        drag(500, 560);

        expect(paneSize()).toBe('360px');
        expect(handle()).toHaveAttribute('aria-valuenow', '360');
    });

    it("should keep the drag within the target's min size and its percentage max size", () => {
        render();

        drag(500, 2000);
        expect(paneSize()).toBe(`${MAX_SIZE}px`);
        expect(handle()).toHaveAttribute('aria-valuemax', `${MAX_SIZE}`);

        drag(500, -2000);
        expect(paneSize()).toBe(`${MIN_SIZE}px`);
        expect(handle()).toHaveAttribute('aria-valuemin', `${MIN_SIZE}`);
    });

    it('should ignore pointer moves outside a drag', () => {
        render();

        spectator.dispatchMouseEvent(handle(), 'pointermove', 560, 0);

        expect(paneSize()).toBe('');
    });

    it('should remember the size once the drag ends', () => {
        render();

        drag(500, 560);

        expect(spectator.inject(StorageService).set).toHaveBeenCalledWith(STORAGE_KEY, 360);
    });

    it("should restore the remembered size as it was, leaving the bounds to the target's CSS", () => {
        render({ stored: 900 });
        spectator.detectChanges();

        expect(spectator.inject(StorageService).get).toHaveBeenCalledWith(STORAGE_KEY);
        expect(paneSize()).toBe('900px');
        expect(handle()).toHaveAttribute('aria-valuenow', `${PANE_SIZE}`);
    });

    it('should step the size with the arrow keys along its axis and remember it', () => {
        render();

        spectator.dispatchKeyboardEvent(handle(), 'keydown', 'ArrowRight');
        expect(paneSize()).toBe('316px');

        spectator.dispatchKeyboardEvent(handle(), 'keydown', 'ArrowLeft');
        spectator.dispatchKeyboardEvent(handle(), 'keydown', 'ArrowLeft');
        expect(paneSize()).toBe('284px');

        spectator.dispatchKeyboardEvent(handle(), 'keydown', 'ArrowDown');
        expect(paneSize()).toBe('284px');
        expect(spectator.inject(StorageService).set).toHaveBeenLastCalledWith(STORAGE_KEY, 284);
    });

    describe('once a layout that hid the target shows it', () => {
        beforeEach(() => {
            render({ initialPaneSize: 0 });
            measurePane(PANE_SIZE);
        });

        it('should step from the size the target has now', () => {
            spectator.dispatchKeyboardEvent(handle(), 'keydown', 'ArrowRight');

            expect(paneSize()).toBe('316px');
        });

        it('should announce the current size and bounds when focused', () => {
            spectator.dispatchFakeEvent(handle(), 'focus');
            spectator.detectChanges();

            expect(handle()).toHaveAttribute('aria-valuenow', `${PANE_SIZE}`);
            expect(handle()).toHaveAttribute('aria-valuemax', `${MAX_SIZE}`);
        });
    });

    it('should resize the height of stacked panes', () => {
        render({ orientation: 'vertical' });

        drag(100, 150, 'y');

        expect(handle()).toHaveAttribute('aria-orientation', 'horizontal');
        expect(paneSize()).toBe('350px');
    });

    it('should remember nothing without a storage key', () => {
        render({ storageKey: '' });

        drag(500, 560);

        expect(paneSize()).toBe('360px');
        expect(spectator.inject(StorageService).get).not.toHaveBeenCalled();
        expect(spectator.inject(StorageService).set).not.toHaveBeenCalled();
    });
});
