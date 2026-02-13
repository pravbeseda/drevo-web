import { provideRouter, Router } from '@angular/router';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { LogExportService } from '@drevo-web/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { User } from '@drevo-web/shared';
import { AuthService } from '../../services/auth/auth.service';
import { AccountDropdownComponent } from './account-dropdown.component';

describe('AccountDropdownComponent', () => {
    let spectator: Spectator<AccountDropdownComponent>;
    let userSubject: BehaviorSubject<User | undefined>;
    let isLoadingSubject: BehaviorSubject<boolean>;
    let authServiceMock: Partial<AuthService>;

    const mockUser: User = {
        id: 1,
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        permissions: {
            canEdit: true,
            canModerate: false,
            canAdmin: false,
        },
    };

    const createComponent = createComponentFactory({
        component: AccountDropdownComponent,
        providers: [
            provideRouter([]),
            MockProvider(LogExportService),
            mockLoggerProvider(),
            {
                provide: AuthService,
                useFactory: () => authServiceMock,
            },
        ],
    });

    beforeEach(() => {
        userSubject = new BehaviorSubject<User | undefined>(undefined);
        isLoadingSubject = new BehaviorSubject<boolean>(false);

        authServiceMock = {
            user$: userSubject.asObservable(),
            isLoading$: isLoadingSubject.asObservable(),
            logout: jest.fn().mockReturnValue(of(undefined)),
        };
    });

    it('should create', () => {
        spectator = createComponent();
        expect(spectator.component).toBeTruthy();
    });

    describe('Loading state', () => {
        it('should show disabled icon button when loading', () => {
            isLoadingSubject.next(true);
            spectator = createComponent();

            const button = spectator.query('ui-icon-button button') as HTMLButtonElement;
            expect(button.disabled).toBe(true);
        });

        it('should not render trigger when loading', () => {
            isLoadingSubject.next(true);
            spectator = createComponent();

            expect(spectator.query('[aria-haspopup="menu"]')).toBeFalsy();
        });
    });

    describe('Authenticated state', () => {
        beforeEach(() => {
            userSubject.next(mockUser);
            spectator = createComponent();
        });

        it('should show account icon button with trigger', () => {
            expect(spectator.query('[aria-haspopup="menu"]')).toBeTruthy();
        });

        it('should compute displayName from user name', () => {
            expect(spectator.component.displayName()).toBe('Test User');
        });

        it('should compute roleLabel from user role', () => {
            expect(spectator.component.roleLabel()).toBe('Пользователь');
        });

        it('should be authenticated', () => {
            expect(spectator.component.isAuthenticated()).toBe(true);
        });
    });

    describe('User display logic', () => {
        it('should fallback to login when name is empty', () => {
            userSubject.next({ ...mockUser, name: '' });
            spectator = createComponent();

            expect(spectator.component.displayName()).toBe('testuser');
        });

        it('should show admin role label', () => {
            userSubject.next({ ...mockUser, role: 'admin' });
            spectator = createComponent();

            expect(spectator.component.roleLabel()).toBe('Администратор');
        });

        it('should show moderator role label', () => {
            userSubject.next({ ...mockUser, role: 'moder' });
            spectator = createComponent();

            expect(spectator.component.roleLabel()).toBe('Модератор');
        });
    });

    describe('Guest state', () => {
        beforeEach(() => {
            userSubject.next(undefined);
            isLoadingSubject.next(false);
            spectator = createComponent();
        });

        it('should not be authenticated', () => {
            expect(spectator.component.isAuthenticated()).toBe(false);
        });

        it('should render trigger button', () => {
            expect(spectator.query('[aria-haspopup="menu"]')).toBeTruthy();
        });
    });

    describe('Logout functionality', () => {
        it('should call authService.logout when logout is called', () => {
            userSubject.next(mockUser);
            spectator = createComponent();

            spectator.component.logout();

            expect(authServiceMock.logout).toHaveBeenCalled();
        });

        it('should set isLoggingOut to true during logout', () => {
            const logoutSubject = new Subject<void>();
            authServiceMock.logout = jest.fn().mockReturnValue(logoutSubject.asObservable());

            userSubject.next(mockUser);
            spectator = createComponent();

            spectator.component.logout();

            expect(spectator.component.isLoggingOut()).toBe(true);
        });

        it('should reset isLoggingOut to false after logout completes', () => {
            userSubject.next(mockUser);
            spectator = createComponent();

            spectator.component.logout();

            expect(spectator.component.isLoggingOut()).toBe(false);
        });

        it('should reset isLoggingOut to false after logout fails', () => {
            authServiceMock.logout = jest.fn().mockReturnValue(throwError(() => new Error('Logout failed')));

            userSubject.next(mockUser);
            spectator = createComponent();

            spectator.component.logout();

            expect(spectator.component.isLoggingOut()).toBe(false);
        });
    });

    describe('Download logs', () => {
        it('should call logExportService.downloadLogs', () => {
            spectator = createComponent();
            const logExportService = spectator.inject(LogExportService);
            jest.spyOn(logExportService, 'downloadLogs').mockResolvedValue();

            spectator.component.downloadLogs();

            expect(logExportService.downloadLogs).toHaveBeenCalled();
        });
    });

    describe('Navigate to login', () => {
        it('should navigate to /login', () => {
            spectator = createComponent();
            const router = spectator.inject(Router);
            jest.spyOn(router, 'navigate').mockResolvedValue(true);

            spectator.component.navigateToLogin();

            expect(router.navigate).toHaveBeenCalledWith(['/login']);
        });
    });

    describe('Dropdown menu rendering', () => {
        function openMenu(): void {
            const trigger = spectator.query('[aria-haspopup="menu"]') as HTMLElement;
            trigger.click();
            spectator.detectChanges();
        }

        it('should render user info and menu items when authenticated', () => {
            userSubject.next(mockUser);
            spectator = createComponent();
            openMenu();

            const overlay = document.querySelector('.cdk-overlay-container')!;
            expect(overlay.querySelector('.dropdown-header-title')?.textContent).toContain('Test User');
            expect(overlay.querySelector('.dropdown-header-subtitle')?.textContent).toContain('Пользователь');
            expect(overlay.querySelectorAll('ui-dropdown-menu-item').length).toBe(2);
        });

        it('should render login item when not authenticated', () => {
            userSubject.next(undefined);
            spectator = createComponent();
            openMenu();

            const overlay = document.querySelector('.cdk-overlay-container')!;
            expect(overlay.querySelectorAll('ui-dropdown-menu-item').length).toBe(1);
            expect(overlay.querySelector('ui-dropdown-menu-item')?.textContent).toContain('Войти');
        });
    });

    describe('Template rendering priority', () => {
        it('should prioritize loading state over authenticated state', () => {
            isLoadingSubject.next(true);
            userSubject.next(mockUser);
            spectator = createComponent();

            expect(spectator.query('[aria-haspopup="menu"]')).toBeFalsy();

            const button = spectator.query('ui-icon-button button') as HTMLButtonElement;
            expect(button.disabled).toBe(true);
        });
    });
});
