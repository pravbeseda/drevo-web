import { Component, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { MockProvider } from 'ng-mocks';
import { DrawerService, WINDOW } from '@drevo-web/core';
import { BREAKPOINT_TABLET } from '@drevo-web/ui';
import { LayoutComponent } from './layout.component';

@Component({ template: '', standalone: true })
class DummyComponent {}

function createMockWindow(innerWidth: number): Window {
    return {
        innerWidth,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        matchMedia: jest.fn(() => ({
            matches: innerWidth < BREAKPOINT_TABLET,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        })),
    } as unknown as Window;
}

function getMediaQueryList(mockWindow: Window): {
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
} {
    return (mockWindow.matchMedia as jest.Mock).mock.results[0].value;
}

function getMediaChangeHandler(
    mockWindow: Window
): (e: Partial<MediaQueryListEvent>) => void {
    return getMediaQueryList(mockWindow).addEventListener.mock.calls[0][1];
}

const MOBILE_WIDTH = 500;

describe('LayoutComponent', () => {
    let spectator: Spectator<LayoutComponent>;
    const createComponent = createComponentFactory({
        component: LayoutComponent,
        providers: [
            provideHttpClient(),
            provideHttpClientTesting(),
            provideRouter([{ path: '**', component: DummyComponent }]),
            { provide: WINDOW, useFactory: () => createMockWindow(BREAKPOINT_TABLET) },
            MockProvider(DrawerService, {
                isOpen: signal(true),
                open: jest.fn(),
                close: jest.fn(),
            }),
        ],
    });

    it('should create', () => {
        spectator = createComponent();

        expect(spectator.component).toBeTruthy();
    });

    it('should apply sidebar-collapsed class when drawer is closed', () => {
        spectator = createComponent({
            providers: [
                MockProvider(DrawerService, {
                    isOpen: signal(false),
                    open: jest.fn(),
                    close: jest.fn(),
                }),
            ],
        });

        const layout = spectator.query('.layout');
        expect(layout).toHaveClass('sidebar-collapsed');
    });

    it('should not apply sidebar-collapsed class when drawer is open', () => {
        spectator = createComponent();

        const layout = spectator.query('.layout');
        expect(layout).not.toHaveClass('sidebar-collapsed');
    });

    it('should call drawerService.close when closeDrawer is called', () => {
        spectator = createComponent();
        const drawerService = spectator.inject(DrawerService);

        spectator.component.closeDrawer();

        expect(drawerService.close).toHaveBeenCalled();
    });

    describe('trackMobileBreakpoint', () => {
        it('should set isMobile to true on mobile viewport', () => {
            spectator = createComponent({
                providers: [
                    { provide: WINDOW, useValue: createMockWindow(MOBILE_WIDTH) },
                    MockProvider(DrawerService, {
                        isOpen: signal(false),
                        open: jest.fn(),
                        close: jest.fn(),
                    }),
                ],
            });

            expect(spectator.component.isMobile()).toBe(true);
        });

        it('should set isMobile to false on tablet viewport', () => {
            spectator = createComponent();

            expect(spectator.component.isMobile()).toBe(false);
        });

        it('should open drawer on initial desktop load', () => {
            spectator = createComponent();
            const drawerService = spectator.inject(DrawerService);

            expect(drawerService.open).toHaveBeenCalled();
        });

        it('should not open drawer on initial mobile load', () => {
            spectator = createComponent({
                providers: [
                    { provide: WINDOW, useValue: createMockWindow(MOBILE_WIDTH) },
                    MockProvider(DrawerService, {
                        isOpen: signal(false),
                        open: jest.fn(),
                        close: jest.fn(),
                    }),
                ],
            });
            const drawerService = spectator.inject(DrawerService);

            expect(drawerService.open).not.toHaveBeenCalled();
        });

        it('should close drawer when viewport switches to mobile', () => {
            const mockWindow = createMockWindow(BREAKPOINT_TABLET);
            spectator = createComponent({
                providers: [
                    { provide: WINDOW, useValue: mockWindow },
                    MockProvider(DrawerService, {
                        isOpen: signal(true),
                        open: jest.fn(),
                        close: jest.fn(),
                    }),
                ],
            });
            const drawerService = spectator.inject(DrawerService);
            const handler = getMediaChangeHandler(mockWindow);

            handler({ matches: true });

            expect(drawerService.close).toHaveBeenCalled();
            expect(spectator.component.isMobile()).toBe(true);
        });

        it('should open drawer when viewport switches to desktop', () => {
            const mockWindow = createMockWindow(MOBILE_WIDTH);
            spectator = createComponent({
                providers: [
                    { provide: WINDOW, useValue: mockWindow },
                    MockProvider(DrawerService, {
                        isOpen: signal(false),
                        open: jest.fn(),
                        close: jest.fn(),
                    }),
                ],
            });
            const drawerService = spectator.inject(DrawerService);
            const handler = getMediaChangeHandler(mockWindow);

            handler({ matches: false });

            expect(drawerService.open).toHaveBeenCalled();
            expect(spectator.component.isMobile()).toBe(false);
        });

        it('should set skipTransition during breakpoint change', () => {
            let rafCallback: FrameRequestCallback | undefined;
            jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(
                cb => {
                    rafCallback = cb;
                    return 0;
                }
            );

            const mockWindow = createMockWindow(BREAKPOINT_TABLET);
            spectator = createComponent({
                providers: [
                    { provide: WINDOW, useValue: mockWindow },
                    MockProvider(DrawerService, {
                        isOpen: signal(true),
                        open: jest.fn(),
                        close: jest.fn(),
                    }),
                ],
            });
            const handler = getMediaChangeHandler(mockWindow);

            handler({ matches: true });

            expect(spectator.component.skipTransition()).toBe(true);

            rafCallback!(0);
            expect(spectator.component.skipTransition()).toBe(false);

            jest.restoreAllMocks();
        });

        it('should remove media query listener on destroy', () => {
            const mockWindow = createMockWindow(BREAKPOINT_TABLET);
            spectator = createComponent({
                providers: [
                    { provide: WINDOW, useValue: mockWindow },
                    MockProvider(DrawerService, {
                        isOpen: signal(true),
                        open: jest.fn(),
                        close: jest.fn(),
                    }),
                ],
            });
            const mql = getMediaQueryList(mockWindow);

            spectator.fixture.destroy();

            expect(mql.removeEventListener).toHaveBeenCalledWith(
                'change',
                expect.any(Function)
            );
        });

        it('should not track breakpoints in SSR (no window)', () => {
            spectator = createComponent({
                providers: [
                    { provide: WINDOW, useValue: undefined },
                    MockProvider(DrawerService, {
                        isOpen: signal(false),
                        open: jest.fn(),
                        close: jest.fn(),
                    }),
                ],
            });

            expect(spectator.component.isMobile()).toBe(false);
        });
    });

    describe('closeDrawerOnMobileNavigation', () => {
        it('should close drawer on navigation when mobile', async () => {
            spectator = createComponent({
                providers: [
                    { provide: WINDOW, useValue: createMockWindow(MOBILE_WIDTH) },
                    MockProvider(DrawerService, {
                        isOpen: signal(false),
                        open: jest.fn(),
                        close: jest.fn(),
                    }),
                ],
            });
            const drawerService = spectator.inject(DrawerService);
            (drawerService.close as jest.Mock).mockClear();

            const router = spectator.inject(Router);
            await router.navigateByUrl('/test');

            expect(drawerService.close).toHaveBeenCalled();
        });

        it('should not close drawer on navigation when not mobile', async () => {
            spectator = createComponent();
            const drawerService = spectator.inject(DrawerService);
            (drawerService.close as jest.Mock).mockClear();

            const router = spectator.inject(Router);
            await router.navigateByUrl('/test');

            expect(drawerService.close).not.toHaveBeenCalled();
        });
    });
});
