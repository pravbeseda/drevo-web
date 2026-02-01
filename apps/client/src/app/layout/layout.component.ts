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
import { RightSidebarComponent } from '@drevo-web/ui';
import { filter } from 'rxjs';

const MOBILE_BREAKPOINT = 768;

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

    ngOnInit(): void {
        this.updateMobileState();
        this.listenToResize();
        this.closeDrawerOnMobileNavigation();
    }

    closeDrawer(): void {
        this.drawerService.close();
    }

    private updateMobileState(): void {
        if (this.window) {
            this.isMobile.set(
                this.window.innerWidth < MOBILE_BREAKPOINT
            );
        }
    }

    private listenToResize(): void {
        if (!this.window) {
            return;
        }

        const mediaQuery = this.window.matchMedia(
            `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
        );

        const handler = (e: MediaQueryListEvent): void => {
            this.isMobile.set(e.matches);
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
