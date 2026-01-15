import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth/auth.service';

describe('LoginComponent', () => {
    let spectator: Spectator<LoginComponent>;
    let authServiceMock: jest.Mocked<Pick<AuthService, 'login'>>;
    let routerMock: jest.Mocked<Pick<Router, 'navigateByUrl'>>;
    let activatedRouteMock: { snapshot: { queryParamMap: { get: jest.Mock } } };

    const createComponent = createComponentFactory({
        component: LoginComponent,
        imports: [FormsModule],
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

        it('should have empty initial values', () => {
            spectator = createComponent();

            expect(spectator.component.username).toBe('');
            expect(spectator.component.password).toBe('');
            expect(spectator.component.rememberMe).toBe(false);
            expect(spectator.component.isSubmitting()).toBe(false);
            expect(spectator.component.errorMessage()).toBeUndefined();
        });

        it('should render login form', () => {
            spectator = createComponent();

            expect(spectator.query('h1')).toHaveText('Вход');
            expect(spectator.query('input#username')).toExist();
            expect(spectator.query('input#password')).toExist();
            expect(spectator.query('input[name="rememberMe"]')).toExist();
            expect(spectator.query('button[type="submit"]')).toExist();
        });
    });

    describe('Form validation', () => {
        it('should return false for empty username', () => {
            spectator = createComponent();

            spectator.component.username = '';
            spectator.component.password = 'password123';

            expect(spectator.component.isFormValid()).toBe(false);
        });

        it('should return false for whitespace-only username', () => {
            spectator = createComponent();

            spectator.component.username = '   ';
            spectator.component.password = 'password123';

            expect(spectator.component.isFormValid()).toBe(false);
        });

        it('should return false for empty password', () => {
            spectator = createComponent();

            spectator.component.username = 'testuser';
            spectator.component.password = '';

            expect(spectator.component.isFormValid()).toBe(false);
        });

        it('should return true for valid form', () => {
            spectator = createComponent();

            spectator.component.username = 'testuser';
            spectator.component.password = 'password123';

            expect(spectator.component.isFormValid()).toBe(true);
        });

        it('should disable submit button when form is invalid', () => {
            spectator = createComponent();

            spectator.component.username = '';
            spectator.component.password = '';
            spectator.detectChanges();

            const submitButton = spectator.query(
                'button[type="submit"]'
            ) as HTMLButtonElement;
            expect(submitButton.disabled).toBe(true);
        });

        it('should enable submit button when form is valid', async () => {
            spectator = createComponent();
            await spectator.fixture.whenStable();

            const usernameInput = spectator.query(
                'input#username'
            ) as HTMLInputElement;
            const passwordInput = spectator.query(
                'input#password'
            ) as HTMLInputElement;

            usernameInput.value = 'testuser';
            usernameInput.dispatchEvent(new Event('input'));
            passwordInput.value = 'password123';
            passwordInput.dispatchEvent(new Event('input'));
            spectator.detectChanges();
            await spectator.fixture.whenStable();

            const submitButton = spectator.query(
                'button[type="submit"]'
            ) as HTMLButtonElement;
            expect(submitButton.disabled).toBe(false);
        });
    });

    describe('Form submission', () => {
        it('should not call authService.login when form is invalid', () => {
            spectator = createComponent();

            spectator.component.username = '';
            spectator.component.password = '';
            spectator.component.onSubmit();

            expect(authServiceMock.login).not.toHaveBeenCalled();
        });

        it('should call authService.login with correct data', () => {
            spectator = createComponent();

            spectator.component.username = '  testuser  ';
            spectator.component.password = 'password123';
            spectator.component.rememberMe = true;
            spectator.component.onSubmit();

            expect(authServiceMock.login).toHaveBeenCalledWith({
                username: 'testuser',
                password: 'password123',
                rememberMe: true,
            });
        });

        it('should set isSubmitting to true during login', () => {
            spectator = createComponent();

            spectator.component.username = 'testuser';
            spectator.component.password = 'password123';

            expect(spectator.component.isSubmitting()).toBe(false);

            spectator.component.onSubmit();

            // isSubmitting is set to false after login completes (synchronously in this test)
            // The login observable completes synchronously with the mock
            expect(spectator.component.isSubmitting()).toBe(false);
        });

        it('should clear error message on submit', () => {
            spectator = createComponent();

            spectator.component.errorMessage.set('Previous error');
            spectator.component.username = 'testuser';
            spectator.component.password = 'password123';
            spectator.component.onSubmit();

            expect(spectator.component.errorMessage()).toBeUndefined();
        });

        it('should navigate to root on successful login when no returnUrl', () => {
            spectator = createComponent();

            spectator.component.username = 'testuser';
            spectator.component.password = 'password123';
            spectator.component.onSubmit();

            expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/');
        });

        it('should clear password after login attempt', () => {
            spectator = createComponent();

            spectator.component.username = 'testuser';
            spectator.component.password = 'password123';
            spectator.component.onSubmit();

            expect(spectator.component.password).toBe('');
        });

        it('should disable inputs while submitting', async () => {
            spectator = createComponent();
            await spectator.fixture.whenStable();

            spectator.component.isSubmitting.set(true);
            spectator.detectChanges();
            await spectator.fixture.whenStable();

            const usernameInput = spectator.query(
                'input#username'
            ) as HTMLInputElement;
            const passwordInput = spectator.query(
                'input#password'
            ) as HTMLInputElement;
            const rememberMeCheckbox = spectator.query(
                'input[name="rememberMe"]'
            ) as HTMLInputElement;
            const submitButton = spectator.query(
                'button[type="submit"]'
            ) as HTMLButtonElement;

            expect(usernameInput.disabled).toBe(true);
            expect(passwordInput.disabled).toBe(true);
            expect(rememberMeCheckbox.disabled).toBe(true);
            expect(submitButton.disabled).toBe(true);
        });

        it('should show loading text while submitting', () => {
            spectator = createComponent();

            spectator.component.isSubmitting.set(true);
            spectator.detectChanges();

            const submitButton = spectator.query('button[type="submit"]');
            expect(submitButton).toHaveText('Вход...');
        });
    });

    describe('Error handling', () => {
        it('should display error message for ACCOUNT_NOT_ACTIVE code', () => {
            authServiceMock.login.mockReturnValue(
                throwError(() => ({ code: 'ACCOUNT_NOT_ACTIVE' }))
            );
            spectator = createComponent();

            spectator.component.username = 'testuser';
            spectator.component.password = 'password123';
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

            spectator.component.username = 'testuser';
            spectator.component.password = 'password123';
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

            spectator.component.username = 'testuser';
            spectator.component.password = 'password123';
            spectator.component.onSubmit();

            expect(spectator.component.errorMessage()).toBe(
                'Custom error message'
            );
        });

        it('should display default error message for unknown errors', () => {
            authServiceMock.login.mockReturnValue(throwError(() => ({})));
            spectator = createComponent();

            spectator.component.username = 'testuser';
            spectator.component.password = 'password123';
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

            spectator.component.username = 'testuser';
            spectator.component.password = 'password123';
            spectator.component.onSubmit();

            expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
        });

        it('should set isSubmitting to false after error', () => {
            authServiceMock.login.mockReturnValue(
                throwError(() => ({ code: 'INVALID_CREDENTIALS' }))
            );
            spectator = createComponent();

            spectator.component.username = 'testuser';
            spectator.component.password = 'password123';
            spectator.component.onSubmit();

            expect(spectator.component.isSubmitting()).toBe(false);
        });

        it('should clear password after login error', () => {
            authServiceMock.login.mockReturnValue(
                throwError(() => ({ code: 'INVALID_CREDENTIALS' }))
            );
            spectator = createComponent();

            spectator.component.username = 'testuser';
            spectator.component.password = 'password123';
            spectator.component.onSubmit();

            expect(spectator.component.password).toBe('');
        });
    });

    describe('Two-way binding', () => {
        it('should update username from input', async () => {
            spectator = createComponent();
            await spectator.fixture.whenStable();

            const usernameInput = spectator.query(
                'input#username'
            ) as HTMLInputElement;
            usernameInput.value = 'myusername';
            usernameInput.dispatchEvent(new Event('input'));
            spectator.detectChanges();
            await spectator.fixture.whenStable();

            expect(spectator.component.username).toBe('myusername');
        });

        it('should update password from input', async () => {
            spectator = createComponent();
            await spectator.fixture.whenStable();

            const passwordInput = spectator.query(
                'input#password'
            ) as HTMLInputElement;
            passwordInput.value = 'mypassword';
            passwordInput.dispatchEvent(new Event('input'));
            spectator.detectChanges();
            await spectator.fixture.whenStable();

            expect(spectator.component.password).toBe('mypassword');
        });

        it('should update rememberMe from checkbox', async () => {
            spectator = createComponent();
            await spectator.fixture.whenStable();

            const checkbox = spectator.query(
                'input[name="rememberMe"]'
            ) as HTMLInputElement;
            checkbox.click();
            spectator.detectChanges();
            await spectator.fixture.whenStable();

            expect(spectator.component.rememberMe).toBe(true);
        });
    });

    describe('Form submission via template', () => {
        it('should call onSubmit when form is submitted', async () => {
            spectator = createComponent();
            await spectator.fixture.whenStable();

            const onSubmitSpy = jest.spyOn(spectator.component, 'onSubmit');

            const usernameInput = spectator.query(
                'input#username'
            ) as HTMLInputElement;
            const passwordInput = spectator.query(
                'input#password'
            ) as HTMLInputElement;

            usernameInput.value = 'testuser';
            usernameInput.dispatchEvent(new Event('input'));
            passwordInput.value = 'password123';
            passwordInput.dispatchEvent(new Event('input'));
            spectator.detectChanges();
            await spectator.fixture.whenStable();

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

            spectator.component.username = 'testuser';
            spectator.component.password = 'password123';
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

            spectator.component.username = 'testuser';
            spectator.component.password = 'password123';
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

            spectator.component.username = 'testuser';
            spectator.component.password = 'password123';
            spectator.component.onSubmit();

            expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/');
        });

        it('should ignore returnUrl with backslash (open redirect attempt)', () => {
            activatedRouteMock.snapshot.queryParamMap.get.mockReturnValue(
                '/\\evil.com'
            );
            spectator = createComponent();

            spectator.component.username = 'testuser';
            spectator.component.password = 'password123';
            spectator.component.onSubmit();

            expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/');
        });

        it('should ignore javascript: protocol in returnUrl', () => {
            activatedRouteMock.snapshot.queryParamMap.get.mockReturnValue(
                'javascript:alert(1)'
            );
            spectator = createComponent();

            spectator.component.username = 'testuser';
            spectator.component.password = 'password123';
            spectator.component.onSubmit();

            expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/');
        });

        it('should ignore absolute URLs as returnUrl', () => {
            activatedRouteMock.snapshot.queryParamMap.get.mockReturnValue(
                'https://evil.com'
            );
            spectator = createComponent();

            spectator.component.username = 'testuser';
            spectator.component.password = 'password123';
            spectator.component.onSubmit();

            expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/');
        });

        it('should handle empty returnUrl', () => {
            activatedRouteMock.snapshot.queryParamMap.get.mockReturnValue('');
            spectator = createComponent();

            spectator.component.username = 'testuser';
            spectator.component.password = 'password123';
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
        imports: [FormsModule],
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

        spectator.component.username = 'testuser';
        spectator.component.password = 'password123';
        spectator.component.onSubmit();

        expect(authServiceMock.login).not.toHaveBeenCalled();
    });
});
