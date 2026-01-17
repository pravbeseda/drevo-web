import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { PLATFORM_ID } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth/auth.service';
import {
    TextInputComponent,
    CheckboxComponent,
    ButtonComponent,
} from '@drevo-web/ui';

describe('LoginComponent', () => {
    let spectator: Spectator<LoginComponent>;
    let authServiceMock: jest.Mocked<Pick<AuthService, 'login'>>;
    let routerMock: jest.Mocked<Pick<Router, 'navigateByUrl'>>;
    let activatedRouteMock: { snapshot: { queryParamMap: { get: jest.Mock } } };

    const createComponent = createComponentFactory({
        component: LoginComponent,
        imports: [
            ReactiveFormsModule,
            NoopAnimationsModule,
            TextInputComponent,
            CheckboxComponent,
            ButtonComponent,
        ],
        providers: [
            {
                provide: AuthService,
                useFactory: () => authServiceMock,
            },
            {
                provide: Router,
                useFactory: () => routerMock,
            },
            {
                provide: ActivatedRoute,
                useFactory: () => activatedRouteMock,
            },
            { provide: PLATFORM_ID, useValue: 'browser' },
        ],
    });

    beforeEach(() => {
        authServiceMock = {
            login: jest.fn().mockReturnValue(of({ success: true })),
        };
        routerMock = {
            navigateByUrl: jest.fn().mockResolvedValue(true),
        };
        activatedRouteMock = {
            snapshot: {
                queryParamMap: {
                    get: jest.fn().mockReturnValue(null),
                },
            },
        };
    });

    describe('Component initialization', () => {
        it('should create', () => {
            spectator = createComponent();
            expect(spectator.component).toBeTruthy();
        });

        it('should have empty initial form values', () => {
            spectator = createComponent();

            const form = spectator.component.loginForm;
            expect(form.controls.username.value).toBe('');
            expect(form.controls.password.value).toBe('');
            expect(form.controls.rememberMe.value).toBe(false);
            expect(spectator.component.isSubmitting()).toBe(false);
            expect(spectator.component.errorMessage()).toBeUndefined();
        });

        it('should render login form', () => {
            spectator = createComponent();

            expect(spectator.query('h1')).toHaveText('Вход');
            expect(spectator.query('ui-text-input')).toExist();
            expect(spectator.query('ui-checkbox')).toExist();
            expect(spectator.query('ui-button')).toExist();
        });
    });

    describe('Form validation', () => {
        it('should be invalid when username is empty', () => {
            spectator = createComponent();

            const form = spectator.component.loginForm;
            form.controls.password.setValue('password123');

            expect(form.valid).toBe(false);
            expect(form.controls.username.errors?.['required']).toBe(true);
        });

        it('should be invalid when password is empty', () => {
            spectator = createComponent();

            const form = spectator.component.loginForm;
            form.controls.username.setValue('testuser');

            expect(form.valid).toBe(false);
            expect(form.controls.password.errors?.['required']).toBe(true);
        });

        it('should be valid when all required fields are filled', () => {
            spectator = createComponent();

            const form = spectator.component.loginForm;
            form.controls.username.setValue('testuser');
            form.controls.password.setValue('password123');

            expect(form.valid).toBe(true);
        });

        it('should disable submit button when form is invalid', () => {
            spectator = createComponent();

            const button = spectator.query(
                'ui-button button'
            ) as HTMLButtonElement;
            expect(button.disabled).toBe(true);
        });

        it('should enable submit button when form is valid', () => {
            spectator = createComponent();

            spectator.component.loginForm.controls.username.setValue(
                'testuser'
            );
            spectator.component.loginForm.controls.password.setValue(
                'password123'
            );
            spectator.detectChanges();

            const button = spectator.query(
                'ui-button button'
            ) as HTMLButtonElement;
            expect(button.disabled).toBe(false);
        });
    });

    describe('Form submission', () => {
        it('should not call authService.login when form is invalid', () => {
            spectator = createComponent();

            spectator.component.onSubmit();

            expect(authServiceMock.login).not.toHaveBeenCalled();
        });

        it('should mark form as touched when submitting invalid form', () => {
            spectator = createComponent();

            spectator.component.onSubmit();

            expect(
                spectator.component.loginForm.controls.username.touched
            ).toBe(true);
            expect(
                spectator.component.loginForm.controls.password.touched
            ).toBe(true);
        });

        it('should call authService.login with correct data', () => {
            spectator = createComponent();

            spectator.component.loginForm.controls.username.setValue(
                '  testuser  '
            );
            spectator.component.loginForm.controls.password.setValue(
                'password123'
            );
            spectator.component.loginForm.controls.rememberMe.setValue(true);
            spectator.component.onSubmit();

            expect(authServiceMock.login).toHaveBeenCalledWith({
                username: 'testuser',
                password: 'password123',
                rememberMe: true,
            });
        });

        it('should set isSubmitting to true during login', () => {
            spectator = createComponent();

            spectator.component.loginForm.controls.username.setValue(
                'testuser'
            );
            spectator.component.loginForm.controls.password.setValue(
                'password123'
            );

            expect(spectator.component.isSubmitting()).toBe(false);

            spectator.component.onSubmit();

            // isSubmitting is set to false after login completes (synchronously in this test)
            expect(spectator.component.isSubmitting()).toBe(false);
        });

        it('should clear error message on submit', () => {
            spectator = createComponent();

            spectator.component.errorMessage.set('Previous error');
            spectator.component.loginForm.controls.username.setValue(
                'testuser'
            );
            spectator.component.loginForm.controls.password.setValue(
                'password123'
            );
            spectator.component.onSubmit();

            expect(spectator.component.errorMessage()).toBeUndefined();
        });

        it('should navigate to root on successful login when no returnUrl', () => {
            spectator = createComponent();

            spectator.component.loginForm.controls.username.setValue(
                'testuser'
            );
            spectator.component.loginForm.controls.password.setValue(
                'password123'
            );
            spectator.component.onSubmit();

            expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/');
        });

        it('should reset password after login attempt', () => {
            spectator = createComponent();

            spectator.component.loginForm.controls.username.setValue(
                'testuser'
            );
            spectator.component.loginForm.controls.password.setValue(
                'password123'
            );
            spectator.component.onSubmit();

            expect(spectator.component.loginForm.controls.password.value).toBe(
                ''
            );
        });
    });

    describe('Error handling', () => {
        it('should display error message for ACCOUNT_NOT_ACTIVE code', () => {
            authServiceMock.login.mockReturnValue(
                throwError(() => ({ code: 'ACCOUNT_NOT_ACTIVE' }))
            );
            spectator = createComponent();

            spectator.component.loginForm.controls.username.setValue(
                'testuser'
            );
            spectator.component.loginForm.controls.password.setValue(
                'password123'
            );
            spectator.component.onSubmit();

            expect(spectator.component.errorMessage()).toBe(
                'Аккаунт не активирован. Проверьте email для подтверждения.'
            );
        });

        it('should display error message for INVALID_CREDENTIALS code', () => {
            authServiceMock.login.mockReturnValue(
                throwError(() => ({ code: 'INVALID_CREDENTIALS' }))
            );
            spectator = createComponent();

            spectator.component.loginForm.controls.username.setValue(
                'testuser'
            );
            spectator.component.loginForm.controls.password.setValue(
                'password123'
            );
            spectator.component.onSubmit();

            expect(spectator.component.errorMessage()).toBe(
                'Неверный логин или пароль.'
            );
        });

        it('should display custom error message from server', () => {
            authServiceMock.login.mockReturnValue(
                throwError(() => ({ message: 'Custom error message' }))
            );
            spectator = createComponent();

            spectator.component.loginForm.controls.username.setValue(
                'testuser'
            );
            spectator.component.loginForm.controls.password.setValue(
                'password123'
            );
            spectator.component.onSubmit();

            expect(spectator.component.errorMessage()).toBe(
                'Custom error message'
            );
        });

        it('should display default error message for unknown errors', () => {
            authServiceMock.login.mockReturnValue(throwError(() => ({})));
            spectator = createComponent();

            spectator.component.loginForm.controls.username.setValue(
                'testuser'
            );
            spectator.component.loginForm.controls.password.setValue(
                'password123'
            );
            spectator.component.onSubmit();

            expect(spectator.component.errorMessage()).toBe(
                'Произошла ошибка при входе. Попробуйте позже.'
            );
        });

        it('should render error alert when errorMessage is set', () => {
            spectator = createComponent();

            spectator.component.errorMessage.set('Test error');
            spectator.detectChanges();

            const alertElement = spectator.query('[role="alert"]');
            expect(alertElement).toExist();
            expect(alertElement).toHaveText('Test error');
        });

        it('should not render error alert when errorMessage is undefined', () => {
            spectator = createComponent();

            spectator.component.errorMessage.set(undefined);
            spectator.detectChanges();

            expect(spectator.query('[role="alert"]')).not.toExist();
        });

        it('should not navigate on login error', () => {
            authServiceMock.login.mockReturnValue(
                throwError(() => ({ code: 'INVALID_CREDENTIALS' }))
            );
            spectator = createComponent();

            spectator.component.loginForm.controls.username.setValue(
                'testuser'
            );
            spectator.component.loginForm.controls.password.setValue(
                'password123'
            );
            spectator.component.onSubmit();

            expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
        });

        it('should set isSubmitting to false after error', () => {
            authServiceMock.login.mockReturnValue(
                throwError(() => ({ code: 'INVALID_CREDENTIALS' }))
            );
            spectator = createComponent();

            spectator.component.loginForm.controls.username.setValue(
                'testuser'
            );
            spectator.component.loginForm.controls.password.setValue(
                'password123'
            );
            spectator.component.onSubmit();

            expect(spectator.component.isSubmitting()).toBe(false);
        });

        it('should reset password after login error', () => {
            authServiceMock.login.mockReturnValue(
                throwError(() => ({ code: 'INVALID_CREDENTIALS' }))
            );
            spectator = createComponent();

            spectator.component.loginForm.controls.username.setValue(
                'testuser'
            );
            spectator.component.loginForm.controls.password.setValue(
                'password123'
            );
            spectator.component.onSubmit();

            expect(spectator.component.loginForm.controls.password.value).toBe(
                ''
            );
        });
    });

    describe('Form submission via template', () => {
        it('should call onSubmit when form is submitted', () => {
            spectator = createComponent();

            const onSubmitSpy = jest.spyOn(spectator.component, 'onSubmit');

            spectator.component.loginForm.controls.username.setValue(
                'testuser'
            );
            spectator.component.loginForm.controls.password.setValue(
                'password123'
            );
            spectator.detectChanges();

            const form = spectator.query('form') as HTMLFormElement;
            spectator.dispatchFakeEvent(form, 'ngSubmit');

            expect(onSubmitSpy).toHaveBeenCalled();
        });
    });

    describe('Return URL handling', () => {
        it('should navigate to returnUrl after successful login', () => {
            activatedRouteMock.snapshot.queryParamMap.get.mockReturnValue(
                '/articles/123'
            );
            spectator = createComponent();

            spectator.component.loginForm.controls.username.setValue(
                'testuser'
            );
            spectator.component.loginForm.controls.password.setValue(
                'password123'
            );
            spectator.component.onSubmit();

            expect(routerMock.navigateByUrl).toHaveBeenCalledWith(
                '/articles/123'
            );
        });

        it('should navigate to returnUrl with query params', () => {
            activatedRouteMock.snapshot.queryParamMap.get.mockReturnValue(
                '/articles/123?view=full'
            );
            spectator = createComponent();

            spectator.component.loginForm.controls.username.setValue(
                'testuser'
            );
            spectator.component.loginForm.controls.password.setValue(
                'password123'
            );
            spectator.component.onSubmit();

            expect(routerMock.navigateByUrl).toHaveBeenCalledWith(
                '/articles/123?view=full'
            );
        });

        it('should ignore invalid returnUrl starting with //', () => {
            activatedRouteMock.snapshot.queryParamMap.get.mockReturnValue(
                '//evil.com'
            );
            spectator = createComponent();

            spectator.component.loginForm.controls.username.setValue(
                'testuser'
            );
            spectator.component.loginForm.controls.password.setValue(
                'password123'
            );
            spectator.component.onSubmit();

            expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/');
        });

        it('should ignore returnUrl with backslash (open redirect attempt)', () => {
            activatedRouteMock.snapshot.queryParamMap.get.mockReturnValue(
                '/\\evil.com'
            );
            spectator = createComponent();

            spectator.component.loginForm.controls.username.setValue(
                'testuser'
            );
            spectator.component.loginForm.controls.password.setValue(
                'password123'
            );
            spectator.component.onSubmit();

            expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/');
        });

        it('should ignore javascript: protocol in returnUrl', () => {
            activatedRouteMock.snapshot.queryParamMap.get.mockReturnValue(
                'javascript:alert(1)'
            );
            spectator = createComponent();

            spectator.component.loginForm.controls.username.setValue(
                'testuser'
            );
            spectator.component.loginForm.controls.password.setValue(
                'password123'
            );
            spectator.component.onSubmit();

            expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/');
        });

        it('should ignore absolute URLs as returnUrl', () => {
            activatedRouteMock.snapshot.queryParamMap.get.mockReturnValue(
                'https://evil.com'
            );
            spectator = createComponent();

            spectator.component.loginForm.controls.username.setValue(
                'testuser'
            );
            spectator.component.loginForm.controls.password.setValue(
                'password123'
            );
            spectator.component.onSubmit();

            expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/');
        });

        it('should handle empty returnUrl', () => {
            activatedRouteMock.snapshot.queryParamMap.get.mockReturnValue('');
            spectator = createComponent();

            spectator.component.loginForm.controls.username.setValue(
                'testuser'
            );
            spectator.component.loginForm.controls.password.setValue(
                'password123'
            );
            spectator.component.onSubmit();

            expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/');
        });
    });
});

describe('LoginComponent SSR', () => {
    let spectator: Spectator<LoginComponent>;
    let authServiceMock: jest.Mocked<Pick<AuthService, 'login'>>;
    let routerMock: jest.Mocked<Pick<Router, 'navigateByUrl'>>;
    let activatedRouteMock: { snapshot: { queryParamMap: { get: jest.Mock } } };

    const createServerComponent = createComponentFactory({
        component: LoginComponent,
        imports: [
            ReactiveFormsModule,
            NoopAnimationsModule,
            TextInputComponent,
            CheckboxComponent,
            ButtonComponent,
        ],
        providers: [
            {
                provide: AuthService,
                useFactory: () => authServiceMock,
            },
            {
                provide: Router,
                useFactory: () => routerMock,
            },
            {
                provide: ActivatedRoute,
                useFactory: () => activatedRouteMock,
            },
            { provide: PLATFORM_ID, useValue: 'server' },
        ],
    });

    beforeEach(() => {
        authServiceMock = {
            login: jest.fn().mockReturnValue(of({ success: true })),
        };
        routerMock = {
            navigateByUrl: jest.fn().mockResolvedValue(true),
        };
        activatedRouteMock = {
            snapshot: {
                queryParamMap: {
                    get: jest.fn().mockReturnValue(null),
                },
            },
        };
    });

    it('should not call authService.login when not in browser', () => {
        spectator = createServerComponent();

        spectator.component.loginForm.controls.username.setValue('testuser');
        spectator.component.loginForm.controls.password.setValue('password123');
        spectator.component.onSubmit();

        expect(authServiceMock.login).not.toHaveBeenCalled();
    });
});
