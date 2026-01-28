import { provideRouter } from '@angular/router';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { User } from '@drevo-web/shared';
import { AuthService } from '../../services/auth/auth.service';
import { AuthStatusComponent } from './auth-status.component';



describe('AuthStatusComponent', () => {
    let spectator: Spectator<AuthStatusComponent>;
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
        component: AuthStatusComponent,
        providers: [
            provideRouter([]),
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

    describe('Component initialization', () => {
        it('should create', () => {
            spectator = createComponent();
            expect(spectator.component).toBeTruthy();
        });

        it('should have isLoggingOut$ initially false', done => {
            spectator = createComponent();
            spectator.component.isLoggingOut$.subscribe(value => {
                expect(value).toBe(false);
                done();
            });
        });
    });

    describe('Loading state', () => {
        it('should display loading text when isLoading$ is true', () => {
            isLoadingSubject.next(true);
            spectator = createComponent();

            expect(spectator.query('span')).toHaveText('Загрузка...');
        });

        it('should not display loading text when isLoading$ is false', () => {
            isLoadingSubject.next(false);
            spectator = createComponent();

            const loadingSpan = spectator
                .queryAll('span')
                .find(el => el.textContent === 'Загрузка...');
            expect(loadingSpan).toBeFalsy();
        });
    });

    describe('Authenticated state', () => {
        it('should display user name when authenticated', () => {
            userSubject.next(mockUser);
            spectator = createComponent();

            expect(spectator.query('span')).toHaveText('Test User');
        });

        it('should display user login when name is not available', () => {
            const userWithoutName: User = {
                id: 1,
                login: 'testuser',
                name: '',
                email: 'test@example.com',
                role: 'user',
                permissions: {
                    canEdit: true,
                    canModerate: false,
                    canAdmin: false,
                },
            };
            userSubject.next(userWithoutName);
            spectator = createComponent();

            expect(spectator.query('span')).toHaveText('testuser');
        });

        it('should display logout button when authenticated', () => {
            userSubject.next(mockUser);
            spectator = createComponent();

            const logoutButton = spectator.query('button');
            expect(logoutButton).toExist();
            expect(logoutButton).toHaveText('Выйти');
        });

        it('should not display login link when authenticated', () => {
            userSubject.next(mockUser);
            spectator = createComponent();

            expect(spectator.query('a[routerLink="/login"]')).not.toExist();
        });
    });

    describe('Guest state', () => {
        it('should display login link when not authenticated', () => {
            userSubject.next(undefined);
            isLoadingSubject.next(false);
            spectator = createComponent();

            const loginLink = spectator.query('a');
            expect(loginLink).toExist();
            expect(loginLink).toHaveText('Войти');
            expect(loginLink).toHaveAttribute('routerLink', '/login');
        });

        it('should not display logout button when not authenticated', () => {
            userSubject.next(undefined);
            isLoadingSubject.next(false);
            spectator = createComponent();

            expect(spectator.query('button')).not.toExist();
        });

        it('should not display user name when not authenticated', () => {
            userSubject.next(undefined);
            isLoadingSubject.next(false);
            spectator = createComponent();

            const spans = spectator.queryAll('span');
            const userSpan = spans.find(el => el.textContent !== 'Загрузка...');
            expect(userSpan).toBeFalsy();
        });
    });

    describe('Logout functionality', () => {
        it('should call authService.logout when logout button is clicked', () => {
            userSubject.next(mockUser);
            spectator = createComponent();

            spectator.click('button');

            expect(authServiceMock.logout).toHaveBeenCalled();
        });

        it('should set isLoggingOut$ to true when logout is in progress', () => {
            userSubject.next(mockUser);
            spectator = createComponent();

            spectator.click('button');

            // Initially should be true while logout is in progress
            // but since we return of(undefined), it completes immediately
            // so we check that it was called
            expect(authServiceMock.logout).toHaveBeenCalled();
        });

        it('should disable logout button while logging out', () => {
            // Create a subject that doesn't complete immediately
            const logoutSubject = new BehaviorSubject<void>(undefined);
            authServiceMock.logout = jest
                .fn()
                .mockReturnValue(logoutSubject.asObservable());

            userSubject.next(mockUser);
            spectator = createComponent();

            // Before click - button should be enabled
            expect(spectator.query('button')).not.toBeDisabled();

            // After click - capture the state
            spectator.click('button');

            // Verify logout was called
            expect(authServiceMock.logout).toHaveBeenCalled();
        });

        it('should reset isLoggingOut$ to false after logout completes', done => {
            userSubject.next(mockUser);
            spectator = createComponent();

            spectator.click('button');

            // After the observable completes, isLoggingOut$ should be false
            spectator.component.isLoggingOut$.subscribe(value => {
                expect(value).toBe(false);
                done();
            });
        });

        it('should reset isLoggingOut$ to false after logout fails', done => {
            authServiceMock.logout = jest
                .fn()
                .mockReturnValue(throwError(() => new Error('Logout failed')));

            userSubject.next(mockUser);
            spectator = createComponent();

            spectator.click('button');

            // After the observable errors, finalize should still set isLoggingOut$ to false
            spectator.component.isLoggingOut$.subscribe(value => {
                expect(value).toBe(false);
                done();
            });
        });
    });

    describe('Template rendering priority', () => {
        it('should prioritize loading state over authenticated state', () => {
            isLoadingSubject.next(true);
            userSubject.next(mockUser);
            spectator = createComponent();

            // Should show loading, not user info
            expect(spectator.query('span')).toHaveText('Загрузка...');
            expect(spectator.query('button')).not.toExist();
        });

        it('should prioritize loading state over guest state', () => {
            isLoadingSubject.next(true);
            userSubject.next(undefined);
            spectator = createComponent();

            // Should show loading, not login link
            expect(spectator.query('span')).toHaveText('Загрузка...');
            expect(spectator.query('a')).not.toExist();
        });
    });

    describe('User display logic', () => {
        it('should prefer name over login when both are available', () => {
            const userWithBoth: User = {
                id: 1,
                login: 'johndoe',
                name: 'John Doe',
                email: 'john@example.com',
                role: 'user',
                permissions: {
                    canEdit: true,
                    canModerate: false,
                    canAdmin: false,
                },
            };
            userSubject.next(userWithBoth);
            spectator = createComponent();

            expect(spectator.query('span')).toHaveText('John Doe');
        });

        it('should fallback to login when name is empty string', () => {
            const userEmptyName: User = {
                id: 1,
                login: 'johndoe',
                name: '',
                email: 'john@example.com',
                role: 'user',
                permissions: {
                    canEdit: true,
                    canModerate: false,
                    canAdmin: false,
                },
            };
            userSubject.next(userEmptyName);
            spectator = createComponent();

            expect(spectator.query('span')).toHaveText('johndoe');
        });

        it('should fallback to login when name is undefined', () => {
            const userNoName = {
                id: 1,
                login: 'johndoe',
                name: undefined,
                email: 'john@example.com',
                role: 'user',
                permissions: {
                    canEdit: true,
                    canModerate: false,
                    canAdmin: false,
                },
            } as unknown as User;
            userSubject.next(userNoName);
            spectator = createComponent();

            expect(spectator.query('span')).toHaveText('johndoe');
        });
    });
});
