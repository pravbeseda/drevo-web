import {
    Component,
    signal,
    inject,
    PLATFORM_ID,
    DestroyRef,
    OnInit,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isValidReturnUrl } from '@drevo-web/shared';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly platformId = inject(PLATFORM_ID);

    private returnUrl = '/';

    username = '';
    password = '';
    rememberMe = false;

    readonly isSubmitting = signal(false);
    readonly errorMessage = signal<string | undefined>(undefined);

    ngOnInit(): void {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl && isValidReturnUrl(returnUrl)) {
            this.returnUrl = returnUrl;
        }
    }

    isFormValid(): boolean {
        return this.username.trim().length > 0 && this.password.length > 0;
    }

    onSubmit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        if (!this.isFormValid()) {
            return;
        }

        this.isSubmitting.set(true);
        this.errorMessage.set(undefined);

        // Capture credentials and clear password immediately
        const credentials = {
            username: this.username.trim(),
            password: this.password,
            rememberMe: this.rememberMe,
        };
        this.password = '';

        this.authService
            .login(credentials)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => {
                    this.isSubmitting.set(false);
                })
            )
            .subscribe({
                next: () => {
                    this.username = '';
                    this.router.navigateByUrl(this.returnUrl);
                },
                error: error => {
                    this.errorMessage.set(this.getErrorMessage(error));
                },
            });
    }

    private getErrorMessage(error: {
        message?: string;
        code?: string;
    }): string {
        if (error.code === 'ACCOUNT_NOT_ACTIVE') {
            return 'Аккаунт не активирован. Проверьте email для подтверждения.';
        }
        if (error.code === 'INVALID_CREDENTIALS') {
            return 'Неверный логин или пароль.';
        }
        return error.message || 'Произошла ошибка при входе. Попробуйте позже.';
    }
}
