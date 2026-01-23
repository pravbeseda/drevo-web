import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { RightSidebarComponent } from '@drevo-web/ui';
import { SidebarService } from '@drevo-web/core';

@Component({
    selector: 'app-layout',
    imports: [HeaderComponent, FooterComponent, RightSidebarComponent],
    templateUrl: './layout.component.html',
    styleUrl: './layout.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent {
    private readonly sidebarService = inject(SidebarService);

    readonly hasActions = computed(() => this.sidebarService.actions().length > 0);
}
