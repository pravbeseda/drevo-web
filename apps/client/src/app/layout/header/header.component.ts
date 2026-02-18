import { AccountDropdownComponent } from './account-dropdown/account-dropdown.component';
import { FontScaleControlComponent } from './font-scale-control/font-scale-control.component';
import { ThemeToggleComponent } from './theme-toggle/theme-toggle.component';
import { PageTitleStrategy } from '../../services/page-title.strategy';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DrawerService } from '@drevo-web/core';
import { IconButtonComponent, LineClampComponent, ModalService } from '@drevo-web/ui';

@Component({
    selector: 'app-header',
    imports: [
        AccountDropdownComponent,
        FontScaleControlComponent,
        LineClampComponent,
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
    private readonly pageTitleStrategy = inject(PageTitleStrategy);
    readonly pageTitle = this.pageTitleStrategy.pageTitle;

    toggleDrawer(): void {
        this.drawerService.toggle();
    }

    openSearch(): void {
        this.modalService.open(() => import('../../features/search/search.component').then(m => m.SearchComponent), {
            width: '600px',
            minHeight: '90vh',
        });
    }
}
