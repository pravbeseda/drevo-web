import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeToggleComponent } from './theme-toggle.component';
import { ThemeService } from '../../services/theme/theme.service';

describe('ThemeToggleComponent', () => {
    let component: ThemeToggleComponent;
    let fixture: ComponentFixture<ThemeToggleComponent>;
    let themeService: ThemeService;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ThemeToggleComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ThemeToggleComponent);
        component = fixture.componentInstance;
        themeService = TestBed.inject(ThemeService);
        fixture.detectChanges();
    });

    afterEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('light-theme', 'dark-theme');
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should show dark_mode icon when theme is light', () => {
        themeService.setTheme('light');
        expect(component.icon).toBe('dark_mode');
    });

    it('should show light_mode icon when theme is dark', () => {
        themeService.setTheme('dark');
        expect(component.icon).toBe('light_mode');
    });

    it('should toggle theme when clicked', () => {
        themeService.setTheme('light');
        component.toggle();
        expect(themeService.theme()).toBe('dark');
    });

    it('should have correct tooltip for light theme', () => {
        themeService.setTheme('light');
        expect(component.tooltip).toBe('Dark theme');
    });

    it('should have correct tooltip for dark theme', () => {
        themeService.setTheme('dark');
        expect(component.tooltip).toBe('Light theme');
    });
});
