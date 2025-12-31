import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthStatusComponent } from '../../components/auth-status/auth-status.component';
import { ThemeToggleComponent } from '../../components/theme-toggle/theme-toggle.component';
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

    openSearch(): void {
        this.modalService.open(
            () =>
                import('../../pages/search/search.component').then(
                    m => m.SearchComponent
                ),
            { width: '600px' }
        );
    }
}
