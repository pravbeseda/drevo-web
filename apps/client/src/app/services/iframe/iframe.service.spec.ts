import { PLATFORM_ID } from '@angular/core';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { IframeService } from './iframe.service';
import { Article } from '@drevo-web/shared';

const allowedOrigin = 'http://drevo-local.ru';

describe('IframeService - Browser Platform', () => {
    let spectator: SpectatorService<IframeService>;
    const createService = createServiceFactory({
        service: IframeService,
        providers: [
            {
                provide: PLATFORM_ID,
                useValue: 'browser',
            },
        ],
    });

    beforeEach(() => {
        jest.spyOn(window, 'addEventListener');
        jest.spyOn(window, 'removeEventListener');
        spectator = createService();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should be created', () => {
        expect(spectator.service).toBeTruthy();
    });

    it('should add message event listener on creation', () => {
        expect(window.addEventListener).toHaveBeenCalledWith(
            'message',
            expect.any(Function)
        );
    });

    it('should emit article when receiving valid message', done => {
        const testArticle: Article = { content: 'Test content' } as Article;

        spectator.service.article$.subscribe(article => {
            expect(article).toEqual(testArticle);
            done();
        });

        window.dispatchEvent(
            new MessageEvent('message', {
                data: { action: 'loadArticle', article: testArticle },
                origin: allowedOrigin,
            })
        );
    });

    it('should not emit article if origin is not allowed', done => {
        const spy = jest.fn();
        spectator.service.article$.subscribe(spy);

        window.dispatchEvent(
            new MessageEvent('message', {
                data: { article: { content: 'Should not emit' } },
                origin: 'http://notallowed.com',
            })
        );

        // Используем небольшой таймаут, чтобы дать возможность событию пройти асинхронно
        setTimeout(() => {
            expect(spy).not.toHaveBeenCalled();
            done();
        }, 50);
    });

    it('should not emit article if event data is invalid', done => {
        const spy = jest.fn();
        spectator.service.article$.subscribe(spy);

        // Отправляем событие без свойства article в data
        window.dispatchEvent(
            new MessageEvent('message', {
                data: {},
                origin: allowedOrigin,
            })
        );

        setTimeout(() => {
            expect(spy).not.toHaveBeenCalled();
            done();
        }, 50);
    });

    it('should remove event listener on destroy', () => {
        spectator.service.ngOnDestroy();
        // При уничтожении сервиса должен удаляться обработчик события "message"
        expect(window.removeEventListener).toHaveBeenCalledWith(
            'message',
            expect.any(Function)
        );
    });
});

describe('IframeService — Non-Browser Platform', () => {
    let spectator: SpectatorService<IframeService>;
    const createService = createServiceFactory({
        service: IframeService,
        providers: [
            {
                provide: PLATFORM_ID,
                useValue: 'server', // Любое значение, кроме "browser", заставляет isPlatformBrowser вернуть false
            },
        ],
    });

    beforeEach(() => {
        jest.spyOn(window, 'addEventListener');
        jest.spyOn(window, 'removeEventListener');
        spectator = createService();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should not add message event listener when not in browser', () => {
        expect(window.addEventListener).not.toHaveBeenCalled();
    });

    it('ngOnDestroy should not remove event listener when not in browser', () => {
        spectator.service.ngOnDestroy();
        expect(window.removeEventListener).not.toHaveBeenCalled();
    });
});
