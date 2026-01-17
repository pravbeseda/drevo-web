import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth/auth.service';
import { isValidReturnUrl } from '@drevo-web/shared';

export const authGuard: CanActivateFn = (
    _route,
    state
): Observable<boolean | UrlTree> | boolean => {
    const platformId = inject(PLATFORM_ID);

    if (!isPlatformBrowser(platformId)) {
        return true;
    }

    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.isLoading$.pipe(
        filter(isLoading => !isLoading),
        take(1),
        map(() => {
            if (authService.isAuthenticated) {
                return true;
            }

            const returnUrl = isValidReturnUrl(state.url) ? state.url : '/';
            return router.createUrlTree(['/login'], {
                queryParams: { returnUrl },
            });
        })
    );
};
