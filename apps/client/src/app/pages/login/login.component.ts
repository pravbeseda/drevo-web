import {
    Component,
    signal,
    inject,
    PLATFORM_ID,
    DestroyRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <h1>Вход</h1>

        @if (errorMessage()) {
            <div role="alert">{{ errorMessage() }}</div>
        }

        <form (ngSubmit)="onSubmit()">
            <div>
                <label for="username">Логин</label>
                <input
                    type="text"
                    id="username"
                    name="username"
                    [(ngModel)]="username"
                    required
                    [disabled]="isSubmitting()" />
            </div>

            <div>
                <label for="password">Пароль</label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    [(ngModel)]="password"
                    required
                    [disabled]="isSubmitting()" />
            </div>

            <div>
                <label>
                    <input
                        type="checkbox"
                        name="rememberMe"
                        [(ngModel)]="rememberMe"
                        [disabled]="isSubmitting()" />
                    Запомнить меня
                </label>
            </div>

            <button
                type="submit"
                [disabled]="isSubmitting() || !isFormValid()">
                @if (isSubmitting()) {
                    Вход...
                } @else {
                    Войти
                }
            </button>
        </form>
    `,
})
export class LoginComponent {
    private readonly destroyRef = inject(DestroyRef);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly platformId = inject(PLATFORM_ID);

    username = '';
    password = '';
    rememberMe = false;

    readonly isSubmitting = signal(false);
    readonly errorMessage = signal<string | null>(null);

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
        this.errorMessage.set(null);

        this.authService
            .login({
                username: this.username.trim(),
                password: this.password,
                rememberMe: this.rememberMe,
            })
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => {
                    this.isSubmitting.set(false);
                    // Clear password from memory after login attempt
                    this.password = '';
                })
            )
            .subscribe({
                next: () => {
                    this.router.navigate(['/']);
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
