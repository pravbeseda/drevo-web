import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { ThemeService } from '../../services/theme/theme.service';
import { ThemeToggleComponent } from './theme-toggle.component';

describe('ThemeToggleComponent', () => {
    let spectator: Spectator<ThemeToggleComponent>;
    let themeService: ThemeService;

    const createComponent = createComponentFactory({
        component: ThemeToggleComponent,
    });

    beforeEach(() => {
        spectator = createComponent();
        themeService = spectator.inject(ThemeService);
    });

    afterEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('light-theme', 'dark-theme');
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should show dark_mode icon when theme is light', () => {
        themeService.setTheme('light');
        expect(spectator.component.icon).toBe('dark_mode');
    });

    it('should show light_mode icon when theme is dark', () => {
        themeService.setTheme('dark');
        expect(spectator.component.icon).toBe('light_mode');
    });

    it('should toggle theme when clicked', () => {
        themeService.setTheme('light');
        spectator.component.toggle();
        expect(themeService.theme()).toBe('dark');
    });
});
