import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { AuthService } from './auth.service';
import { CsrfService } from './csrf.service';
import { LoggerService } from '../logger/logger.service';

jest.mock('../../../environments/environment', () => ({
    environment: { apiUrl: 'http://test-api', production: false },
}));

describe('AuthService SSR', () => {
    let spectator: SpectatorService<AuthService>;
    let httpController: HttpTestingController;

    const createService = createServiceFactory({
        service: AuthService,
        providers: [
            provideHttpClient(),
            provideHttpClientTesting(),
            { provide: PLATFORM_ID, useValue: 'server' },
        ],
        mocks: [CsrfService, LoggerService],
    });

    beforeEach(() => {
        spectator = createService();
        httpController = spectator.inject(HttpTestingController);
    });

    afterEach(() => {
        httpController.verify();
    });

    describe('checkAuth on server', () => {
        it('should return unauthenticated state without making HTTP request', done => {
            spectator.service.checkAuth().subscribe(state => {
                expect(state.isAuthenticated).toBe(false);
                expect(state.user).toBeNull();
                expect(state.isLoading).toBe(false);
                done();
            });

            // No HTTP request should be made on server
            httpController.expectNone('http://test-api/api/auth/me');
        });
    });

    describe('login on server', () => {
        it('should throw error indicating login is only available in browser', done => {
            spectator.service.login({ username: 'test', password: 'test' }).subscribe({
                error: error => {
                    expect(error.message).toBe('Login is only available in browser');
                    done();
                },
            });

            // No HTTP request should be made
            httpController.expectNone('http://test-api/api/auth/login');
        });
    });

    describe('logout on server', () => {
        it('should return void without making HTTP request', done => {
            spectator.service.logout().subscribe({
                next: result => {
                    expect(result).toBeUndefined();
                    done();
                },
            });

            // No HTTP request should be made on server
            httpController.expectNone('http://test-api/api/auth/logout');
        });
    });

    describe('initial state on server', () => {
        it('should not call initCsrfToken on server', () => {
            const csrfService = spectator.inject(CsrfService) as jest.Mocked<CsrfService>;
            expect(csrfService.initCsrfToken).not.toHaveBeenCalled();
        });

        it('should not call setHttpClient on server', () => {
            const csrfService = spectator.inject(CsrfService) as jest.Mocked<CsrfService>;
            expect(csrfService.setHttpClient).not.toHaveBeenCalled();
        });

        it('should set isLoading to false immediately', done => {
            spectator.service.isLoading$.subscribe(isLoading => {
                expect(isLoading).toBe(false);
                done();
            });
        });
    });

    describe('currentUser on server', () => {
        it('should return null', () => {
            expect(spectator.service.currentUser).toBeNull();
        });
    });

    describe('isAuthenticated on server', () => {
        it('should return false', () => {
            expect(spectator.service.isAuthenticated).toBe(false);
        });
    });
});
