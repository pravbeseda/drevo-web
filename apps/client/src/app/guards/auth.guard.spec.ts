import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import {
    ActivatedRouteSnapshot,
    Router,
    RouterStateSnapshot,
    UrlTree,
} from '@angular/router';
import {
    PLATFORM_ID,
    EnvironmentInjector,
    runInInjectionContext,
    Injectable,
} from '@angular/core';
import { BehaviorSubject, isObservable, firstValueFrom } from 'rxjs';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth/auth.service';

/**
 * Dummy service to bootstrap Spectator's injection context
 */
@Injectable()
class GuardTestHelper {}

describe('authGuard in browser', () => {
    let spectator: SpectatorService<GuardTestHelper>;
    let authServiceMock: {
        isAuthenticated: boolean;
        isLoading$: BehaviorSubject<boolean>;
    };
    let routerMock: { createUrlTree: jest.Mock };
    let mockRoute: ActivatedRouteSnapshot;
    let mockState: RouterStateSnapshot;

    const createService = createServiceFactory({
        service: GuardTestHelper,
        providers: [
            {
                provide: AuthService,
                useFactory: () => authServiceMock,
            },
            {
                provide: Router,
                useFactory: () => routerMock,
            },
            { provide: PLATFORM_ID, useValue: 'browser' },
        ],
    });

    const runGuard = () =>
        runInInjectionContext(spectator.inject(EnvironmentInjector), () =>
            authGuard(mockRoute, mockState)
        );

    beforeEach(() => {
        authServiceMock = {
            isAuthenticated: false,
            isLoading$: new BehaviorSubject<boolean>(false),
        };

        routerMock = {
            createUrlTree: jest.fn().mockReturnValue({} as UrlTree),
        };

        mockRoute = {} as ActivatedRouteSnapshot;
        mockState = { url: '/some-page' } as RouterStateSnapshot;

        spectator = createService();
    });

    it('should allow access when user is authenticated', async () => {
        authServiceMock.isAuthenticated = true;
        authServiceMock.isLoading$.next(false);

        const result = runGuard();

        if (isObservable(result)) {
            expect(await firstValueFrom(result)).toBe(true);
        } else {
            expect(result).toBe(true);
        }
    });

    it('should redirect to /login with returnUrl when not authenticated', async () => {
        authServiceMock.isAuthenticated = false;
        authServiceMock.isLoading$.next(false);

        const result = runGuard();

        if (isObservable(result)) {
            await firstValueFrom(result);
        }

        expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login'], {
            queryParams: { returnUrl: '/some-page' },
        });
    });

    it('should wait for loading to complete before checking auth', async () => {
        authServiceMock.isLoading$.next(true);
        authServiceMock.isAuthenticated = false;

        const result = runGuard();

        let emitted = false;

        if (isObservable(result)) {
            const promise = firstValueFrom(result).then(() => {
                emitted = true;
            });

            // Should not emit while loading
            await new Promise(r => setTimeout(r, 10));
            expect(emitted).toBe(false);

            // Complete loading with authenticated user
            authServiceMock.isAuthenticated = true;
            authServiceMock.isLoading$.next(false);

            await promise;
            expect(emitted).toBe(true);
        }
    });

    it('should encode returnUrl with query params correctly', async () => {
        mockState = {
            url: '/articles/123?view=full',
        } as RouterStateSnapshot;
        authServiceMock.isAuthenticated = false;
        authServiceMock.isLoading$.next(false);

        const result = runGuard();

        if (isObservable(result)) {
            await firstValueFrom(result);
        }

        expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login'], {
            queryParams: { returnUrl: '/articles/123?view=full' },
        });
    });
});

describe('authGuard on server (SSR)', () => {
    let spectator: SpectatorService<GuardTestHelper>;
    let authServiceMock: {
        isAuthenticated: boolean;
        isLoading$: BehaviorSubject<boolean>;
    };
    let routerMock: { createUrlTree: jest.Mock };

    const createService = createServiceFactory({
        service: GuardTestHelper,
        providers: [
            {
                provide: AuthService,
                useFactory: () => authServiceMock,
            },
            {
                provide: Router,
                useFactory: () => routerMock,
            },
            { provide: PLATFORM_ID, useValue: 'server' },
        ],
    });

    beforeEach(() => {
        authServiceMock = {
            isAuthenticated: false,
            isLoading$: new BehaviorSubject<boolean>(false),
        };

        routerMock = {
            createUrlTree: jest.fn().mockReturnValue({} as UrlTree),
        };

        spectator = createService();
    });

    it('should always allow access on server', () => {
        const result = runInInjectionContext(
            spectator.inject(EnvironmentInjector),
            () =>
                authGuard(
                    {} as ActivatedRouteSnapshot,
                    { url: '/some-page' } as RouterStateSnapshot
                )
        );

        expect(result).toBe(true);
    });
});
