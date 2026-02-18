import { AuthService } from '../../../services/auth/auth.service';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { LogExportService, LoggerService } from '@drevo-web/core';
import { USER_ROLE_LABELS } from '@drevo-web/shared';
import {
    DropdownMenuComponent,
    DropdownMenuItemComponent,
    DropdownMenuTriggerDirective,
    IconButtonComponent,
} from '@drevo-web/ui';
import { finalize } from 'rxjs/operators';

@Component({
    selector: 'app-account-dropdown',
    imports: [IconButtonComponent, DropdownMenuComponent, DropdownMenuItemComponent, DropdownMenuTriggerDirective],
    templateUrl: './account-dropdown.component.html',
    styleUrl: './account-dropdown.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDropdownComponent {
    private readonly destroyRef = inject(DestroyRef);
    private readonly authService = inject(AuthService);
    private readonly logExportService = inject(LogExportService);
    private readonly router = inject(Router);
    private readonly logger = inject(LoggerService).withContext('AccountDropdown');

    private readonly user = toSignal(this.authService.user$);

    readonly isLoading = toSignal(this.authService.isLoading$, {
        initialValue: false,
    });
    private readonly _isLoggingOut = signal(false);
    readonly isLoggingOut = this._isLoggingOut.asReadonly();
    readonly isAuthenticated = computed(() => !!this.user());
    readonly displayName = computed(() => {
        const user = this.user();
        return user ? user.name || user.login : '';
    });
    readonly roleLabel = computed(() => {
        const user = this.user();
        return user ? USER_ROLE_LABELS[user.role] : '';
    });

    logout(): void {
        this.logger.info('User initiated logout');
        this._isLoggingOut.set(true);
        this.authService
            .logout()
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this._isLoggingOut.set(false))
            )
            .subscribe();
    }

    downloadLogs(): void {
        void this.logExportService.downloadLogs();
    }

    navigateToLogin(): void {
        this.logger.info('Navigating to login page');
        void this.router.navigate(['/login']);
    }
}
