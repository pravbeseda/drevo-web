import { HeaderComponent } from './header/header.component';
import { SidebarNavComponent } from './sidebar-nav/sidebar-nav.component';
import { VersionDisplayComponent } from '../components/version-display/version-display.component';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { DrawerService, SidebarService, WINDOW } from '@drevo-web/core';
import { BREAKPOINT_TABLET, RightSidebarComponent } from '@drevo-web/ui';
import { filter } from 'rxjs';

@Component({
    selector: 'app-layout',
    imports: [
        HeaderComponent,
        SidebarNavComponent,
        VersionDisplayComponent,
        RightSidebarComponent,
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

    readonly hasActions = computed(
        () => this.sidebarService.actions().length > 0
    );

    readonly isDrawerOpen = this.drawerService.isOpen;
    readonly isMobile = signal(false);
    readonly skipTransition = signal(false);

    constructor() {
        if (this.window && this.window.innerWidth >= BREAKPOINT_TABLET) {
            this.drawerService.open();
        }
    }

    ngOnInit(): void {
        this.trackMobileBreakpoint();
        this.closeDrawerOnMobileNavigation();
    }

    closeDrawer(): void {
        this.drawerService.close();
    }

    private trackMobileBreakpoint(): void {
        if (!this.window) {
            return;
        }

        const mediaQuery = this.window.matchMedia(
            `(max-width: ${BREAKPOINT_TABLET - 1}px)`
        );

        this.isMobile.set(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent): void => {
            this.skipTransition.set(true);
            this.isMobile.set(e.matches);

            if (e.matches) {
                this.drawerService.close();
            } else {
                this.drawerService.open();
            }

            setTimeout(() => this.skipTransition.set(false));
        };

        mediaQuery.addEventListener('change', handler);
        this.destroyRef.onDestroy(() => {
            mediaQuery.removeEventListener('change', handler);
        });
    }

    private closeDrawerOnMobileNavigation(): void {
        this.router.events
            .pipe(
                filter(
                    (event): event is NavigationEnd =>
                        event instanceof NavigationEnd
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => {
                if (this.isMobile()) {
                    this.drawerService.close();
                }
            });
    }
}
