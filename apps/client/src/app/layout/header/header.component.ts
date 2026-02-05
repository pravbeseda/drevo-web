import { AccountDropdownComponent } from '../../components/account-dropdown/account-dropdown.component';
import { FontScaleControlComponent } from '../../components/font-scale-control/font-scale-control.component';
import { ThemeToggleComponent } from '../../components/theme-toggle/theme-toggle.component';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DrawerService } from '@drevo-web/core';
import { IconButtonComponent, ModalService } from '@drevo-web/ui';

@Component({
    selector: 'app-header',
    imports: [
        AccountDropdownComponent,
        FontScaleControlComponent,
        ThemeToggleComponent,
        IconButtonComponent,
    ],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
    private readonly modalService = inject(ModalService);
    private readonly drawerService = inject(DrawerService);

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
}
