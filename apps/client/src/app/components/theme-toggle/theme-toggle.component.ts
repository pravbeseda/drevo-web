import { ThemeService } from '../../services/theme/theme.service';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { IconButtonComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-theme-toggle',
    imports: [IconButtonComponent],
    templateUrl: './theme-toggle.component.html',
    styleUrl: './theme-toggle.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggleComponent {
    private readonly themeService = inject(ThemeService);

    readonly icon = computed(() =>
        this.themeService.isDark() ? 'light_mode' : 'dark_mode'
    );
    readonly tooltip = computed(() =>
        this.themeService.isDark() ? 'Светлая тема' : 'Темная тема'
    );

    toggle(): void {
        this.themeService.toggleTheme();
    }
}
