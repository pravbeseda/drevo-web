import { AuthStatusComponent } from '../../components/auth-status/auth-status.component';
import { ThemeToggleComponent } from '../../components/theme-toggle/theme-toggle.component';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DrawerService, LogExportService } from '@drevo-web/core';
import { IconButtonComponent, ModalService } from '@drevo-web/ui';

@Component({
    selector: 'app-header',
    imports: [AuthStatusComponent, ThemeToggleComponent, IconButtonComponent],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
    private readonly modalService = inject(ModalService);
    private readonly logExportService = inject(LogExportService);
    private readonly drawerService = inject(DrawerService);

    readonly isDrawerOpen = this.drawerService.isOpen;

    toggleDrawer(): void {
        this.drawerService.toggle();
    }

    openSearch(): void {
        this.modalService.open(
            () =>
                import('../../pages/search/search.component').then(
                    m => m.SearchComponent
                ),
            { width: '600px', minHeight: '90vh' }
        );
    }

    downloadLogs(): void {
        void this.logExportService.downloadLogs();
    }
}
