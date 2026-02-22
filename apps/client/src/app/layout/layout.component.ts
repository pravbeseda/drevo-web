import { HeaderComponent } from './header/header.component';
import { RightSidebarComponent } from './right-sidebar/right-sidebar.component';
import { SidebarNavComponent } from './sidebar-nav/sidebar-nav.component';
import { VersionDisplayComponent } from './version-display/version-display.component';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    OnInit,
    signal,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { DrawerService, SidebarService, WINDOW } from '@drevo-web/core';
import { BREAKPOINT_TABLET, NavigationProgressComponent } from '@drevo-web/ui';
import { filter, map, of, switchMap, timer } from 'rxjs';

const NAVIGATION_DEBOUNCE_MS = 100;

@Component({
    selector: 'app-layout',
    imports: [
        HeaderComponent,
        SidebarNavComponent,
        VersionDisplayComponent,
        RightSidebarComponent,
        NavigationProgressComponent,
    ],
    templateUrl: './layout.component.html',
    styleUrl: './layout.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent implements OnInit {
    private readonly sidebarService = inject(SidebarService);
    private readonly drawerService = inject(DrawerService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly window = inject(WINDOW);
    private readonly contentEl = viewChild<ElementRef<HTMLElement>>('contentEl');

    readonly hasActions = computed(() => this.sidebarService.actions().length > 0);

    readonly isNavigating = toSignal(
        this.router.events.pipe(
            filter(
                e =>
                    e instanceof NavigationStart ||
                    e instanceof NavigationEnd ||
                    e instanceof NavigationCancel ||
                    e instanceof NavigationError
            ),
            map(e => e instanceof NavigationStart),
            switchMap(navigating => (navigating ? timer(NAVIGATION_DEBOUNCE_MS).pipe(map(() => true)) : of(false)))
        ),
        { initialValue: false }
    );

    readonly isDrawerOpen = this.drawerService.isOpen;
    readonly isMobile = signal(false);
    readonly skipTransition = signal(false);

    ngOnInit(): void {
        this.trackMobileBreakpoint();
        this.handleNavigationEnd();
    }

    closeDrawer(): void {
        this.drawerService.close();
    }

    private trackMobileBreakpoint(): void {
        if (!this.window) {
            return;
        }

        const mediaQuery = this.window.matchMedia(`(max-width: ${BREAKPOINT_TABLET - 1}px)`);

        this.isMobile.set(mediaQuery.matches);

        if (!mediaQuery.matches) {
            this.drawerService.restoreSaved();
        }

        let rafId = 0;

        const handler = (e: MediaQueryListEvent): void => {
            this.skipTransition.set(true);
            this.isMobile.set(e.matches);

            if (e.matches) {
                this.drawerService.close();
            } else {
                this.drawerService.restoreSaved();
            }

            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => this.skipTransition.set(false));
        };

        mediaQuery.addEventListener('change', handler);
        this.destroyRef.onDestroy(() => {
            cancelAnimationFrame(rafId);
            mediaQuery.removeEventListener('change', handler);
        });
    }

    private handleNavigationEnd(): void {
        this.router.events
            .pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(event => {
                if (this.isMobile()) {
                    this.drawerService.close();
                }

                if (!new URL(event.urlAfterRedirects, 'http://_').hash) {
                    this.contentEl()?.nativeElement.scrollTo?.(0, 0);
                }
            });
    }
}
