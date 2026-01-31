import { HeaderComponent } from './header/header.component';
import { VersionDisplayComponent } from '../components/version-display/version-display.component';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { SidebarService } from '@drevo-web/core';
import { RightSidebarComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-layout',
    imports: [HeaderComponent, VersionDisplayComponent, RightSidebarComponent],
    templateUrl: './layout.component.html',
    styleUrl: './layout.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent {
    private readonly sidebarService = inject(SidebarService);

    readonly hasActions = computed(
        () => this.sidebarService.actions().length > 0
    );
}
