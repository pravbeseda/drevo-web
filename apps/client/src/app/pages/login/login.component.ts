import { AuthService } from '../../services/auth/auth.service';
import { isPlatformBrowser } from '@angular/common';
import {
    Component,
    signal,
    inject,
    PLATFORM_ID,
    DestroyRef,
    OnInit,
    ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { isValidReturnUrl } from '@drevo-web/shared';
import {
    TextInputComponent,
    CheckboxComponent,
    ButtonComponent,
} from '@drevo-web/ui';
import { finalize } from 'rxjs';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        TextInputComponent,
        CheckboxComponent,
        ButtonComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
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

    readonly loginForm = new FormGroup({
        username: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required],
        }),
        password: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required],
        }),
        rememberMe: new FormControl(false, { nonNullable: true }),
    });

    readonly isSubmitting = signal(false);
    readonly errorMessage = signal<string | undefined>(undefined);

    ngOnInit(): void {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl && isValidReturnUrl(returnUrl)) {
            this.returnUrl = returnUrl;
        }
    }

    onSubmit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        if (this.loginForm.invalid) {
            this.loginForm.markAllAsTouched();
            return;
        }

        this.isSubmitting.set(true);
        this.errorMessage.set(undefined);
        this.loginForm.disable();

        // Capture credentials and clear password immediately
        const { username, password, rememberMe } = this.loginForm.getRawValue();
        const credentials = {
            username: username.trim(),
            password,
            rememberMe,
        };
        this.loginForm.controls.password.reset();

        this.authService
            .login(credentials)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => {
                    this.isSubmitting.set(false);
                    this.loginForm.enable();
                })
            )
            .subscribe({
                next: () => {
                    this.loginForm.reset();
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
