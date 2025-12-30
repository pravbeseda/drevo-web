import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AuthStatusComponent } from '../components/auth-status/auth-status.component';
import { ThemeToggleComponent } from '../components/theme-toggle/theme-toggle.component';
import { FooterComponent } from './footer/footer.component';

@Component({
    selector: 'app-layout',
    imports: [AuthStatusComponent, ThemeToggleComponent, FooterComponent],
    templateUrl: './layout.component.html',
    styleUrl: './layout.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent {}
