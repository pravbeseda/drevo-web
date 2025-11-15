import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { YiiNavigationService } from './yii-navigation.service';

describe('YiiNavigationService', () => {
    let spectator: SpectatorService<YiiNavigationService>;
    let mockRouter: { events: Subject<unknown>; navigate: jest.Mock };
    const createService = createServiceFactory({
        service: YiiNavigationService,
    });

    beforeEach(() => {
        const eventsSubject = new Subject();
        mockRouter = {
            events: eventsSubject,
            navigate: jest.fn(),
        };
        spectator = createService({
            providers: [{ provide: Router, useValue: mockRouter }],
        });
    });

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });

    describe('isAngularRoute', () => {
        it('should return false for root path', () => {
            expect(spectator.service.isAngularRoute('/')).toBe(false);
        });

        it('should return true for /editor', () => {
            expect(spectator.service.isAngularRoute('/editor')).toBe(true);
        });

        it('should return false for Yii routes', () => {
            expect(spectator.service.isAngularRoute('/articles/123')).toBe(
                false
            );
            expect(spectator.service.isAngularRoute('/user/profile')).toBe(
                false
            );
        });

        it('should handle query params and hash', () => {
            expect(
                spectator.service.isAngularRoute('/editor?id=123')
            ).toBe(true);
            expect(
                spectator.service.isAngularRoute('/editor#section')
            ).toBe(true);
            expect(
                spectator.service.isAngularRoute('/articles/123?page=1#top')
            ).toBe(false);
        });
    });

    describe('getYiiUrl', () => {
        it('should return correct Yii URL', () => {
            expect(
                spectator.service.getYiiUrl('/articles/123')
            ).toBe('/legacy/articles/123');
            expect(
                spectator.service.getYiiUrl('articles/123')
            ).toBe('/legacy/articles/123');
        });

        it('should handle empty path', () => {
            expect(spectator.service.getYiiUrl('')).toBe('/legacy/');
        });
    });

    describe('registerAngularRoute', () => {
        it('should register new Angular route', () => {
            spectator.service.registerAngularRoute('/new-page');
            expect(spectator.service.isAngularRoute('/new-page')).toBe(true);
        });

        it('should not register duplicate routes', () => {
            const initialCount = spectator.service.getAngularRoutes().length;
            spectator.service.registerAngularRoute('/editor');
            expect(spectator.service.getAngularRoutes().length).toBe(
                initialCount
            );
        });
    });

    describe('handleIframeNavigation', () => {
        it('should navigate to new path', () => {
            spectator.service.handleIframeNavigation('/articles/123');
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/articles/123'], {
                replaceUrl: false,
                skipLocationChange: false,
            });
        });
    });

    describe('sendMessageToIframe', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should send message to iframe if it exists', () => {
            const mockIframe = {
                contentWindow: {
                    postMessage: jest.fn(),
                },
            };

            jest.spyOn(document, 'querySelector').mockReturnValue(
                mockIframe as unknown as Element
            );

            const testMessage = { type: 'test', data: 'hello' };
            spectator.service.sendMessageToIframe(testMessage);

            expect(
                mockIframe.contentWindow.postMessage
            ).toHaveBeenCalledWith(testMessage, window.location.origin);
        });

        it('should not throw error if iframe does not exist', () => {
            jest.spyOn(document, 'querySelector').mockReturnValue(null);
            expect(() =>
                spectator.service.sendMessageToIframe({ type: 'test' })
            ).not.toThrow();
        });
    });
});
