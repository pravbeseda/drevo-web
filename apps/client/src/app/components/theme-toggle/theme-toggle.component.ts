import { ThemeService } from '../../services/theme/theme.service';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconButtonComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-theme-toggle',
    imports: [IconButtonComponent],
    templateUrl: './theme-toggle.component.html',
    styleUrl: './theme-toggle.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggleComponent {
    protected readonly themeService = inject(ThemeService);

    get icon(): string {
        return this.themeService.isDark() ? 'light_mode' : 'dark_mode';
    }

    get tooltip(): string {
        return this.themeService.isDark() ? 'Светлая тема' : 'Темная тема';
    }

    toggle(): void {
        this.themeService.toggleTheme();
    }
}
