import { AuthService } from '../auth/auth.service';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { User } from '@drevo-web/shared';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';
import { InworkApiService } from './inwork-api.service';
import { InworkService } from './inwork.service';

const mockUser: User = {
    id: 1,
    login: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    permissions: { canEdit: true, canModerate: false, canAdmin: false },
};

describe('InworkService', () => {
    let spectator: SpectatorService<InworkService>;
    let inworkApiService: jest.Mocked<InworkApiService>;
    let authService: jest.Mocked<AuthService>;

    const createService = createServiceFactory({
        service: InworkService,
        mocks: [InworkApiService, AuthService],
        providers: [mockLoggerProvider()],
    });

    beforeEach(() => {
        spectator = createService();
        inworkApiService = spectator.inject(InworkApiService) as jest.Mocked<InworkApiService>;
        authService = spectator.inject(AuthService) as jest.Mocked<AuthService>;
        Object.defineProperty(authService, 'currentUser', { get: () => mockUser, configurable: true });
    });

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });

    describe('getActiveEditor', () => {
        it('should delegate to InworkApiService with articles module', () => {
            inworkApiService.check.mockReturnValue(of({ editor: 'Other User' }));

            spectator.service.getActiveEditor('Test Title').subscribe();

            expect(inworkApiService.check).toHaveBeenCalledWith('articles', 'Test Title');
        });

        it('should return editor name when another user is editing', () => {
            inworkApiService.check.mockReturnValue(of({ editor: 'Other User' }));

            let result: string | undefined;
            spectator.service.getActiveEditor('Test').subscribe(r => {
                result = r;
            });

            expect(result).toBe('Other User');
        });

        it('should return undefined when current user is the editor', () => {
            inworkApiService.check.mockReturnValue(of({ editor: 'Test User' }));

            let result: string | undefined;
            spectator.service.getActiveEditor('Test').subscribe(r => {
                result = r;
            });

            expect(result).toBeUndefined();
        });

        it('should return undefined when editor is empty string', () => {
            inworkApiService.check.mockReturnValue(of({ editor: '' }));

            let result: string | undefined;
            spectator.service.getActiveEditor('Test').subscribe(r => {
                result = r;
            });

            expect(result).toBeUndefined();
        });

        it('should return undefined when editor is not present', () => {
            inworkApiService.check.mockReturnValue(of({ editor: undefined }));

            let result: string | undefined;
            spectator.service.getActiveEditor('Test').subscribe(r => {
                result = r;
            });

            expect(result).toBeUndefined();
        });

        it('should return undefined on error', () => {
            inworkApiService.check.mockReturnValue(throwError(() => new Error('Network error')));

            let result: string | undefined;
            spectator.service.getActiveEditor('Test').subscribe(r => {
                result = r;
            });

            expect(result).toBeUndefined();
        });
    });

    describe('getInworkList', () => {
        it('should delegate to InworkApiService', () => {
            inworkApiService.getList.mockReturnValue(of([]));

            spectator.service.getInworkList().subscribe();

            expect(inworkApiService.getList).toHaveBeenCalled();
        });

        it('should map DTOs to domain models', () => {
            const dto = { id: 1, module: 'articles', title: 'Test', author: 'User', lasttime: '2024-01-01', age: 10 };
            inworkApiService.getList.mockReturnValue(of([dto]));

            let result: unknown;
            spectator.service.getInworkList().subscribe(r => {
                result = r;
            });

            expect(result).toEqual([
                { id: 1, module: 'articles', title: 'Test', author: 'User', lastTime: '2024-01-01', age: 10 },
            ]);
        });

        it('should return empty list on error', () => {
            inworkApiService.getList.mockReturnValue(throwError(() => new Error('Network error')));

            let result: unknown;
            spectator.service.getInworkList().subscribe(items => {
                result = items;
            });

            expect(result).toEqual([]);
        });
    });

    describe('markEditing', () => {
        it('should delegate to InworkApiService with articles module', () => {
            inworkApiService.markEditing.mockReturnValue(of(undefined));

            spectator.service.markEditing('Test Title', 456).subscribe();

            expect(inworkApiService.markEditing).toHaveBeenCalledWith('articles', 'Test Title', 456);
        });

        it('should not throw on error', () => {
            inworkApiService.markEditing.mockReturnValue(throwError(() => new Error('Network error')));

            expect(() => {
                spectator.service.markEditing('Test', 1).subscribe();
            }).not.toThrow();
        });
    });

    describe('clearEditing', () => {
        it('should delegate to InworkApiService with articles module', () => {
            inworkApiService.clearEditing.mockReturnValue(of(undefined));

            spectator.service.clearEditing('Test Title').subscribe();

            expect(inworkApiService.clearEditing).toHaveBeenCalledWith('articles', 'Test Title');
        });

        it('should propagate error to caller', () => {
            inworkApiService.clearEditing.mockReturnValue(throwError(() => new Error('Network error')));

            const errorSpy = jest.fn();
            spectator.service.clearEditing('Test').subscribe({ error: errorSpy });

            expect(errorSpy).toHaveBeenCalled();
        });
    });
});
