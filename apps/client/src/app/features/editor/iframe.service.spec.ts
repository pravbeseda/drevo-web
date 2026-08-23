import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { WINDOW } from '@drevo-web/core';
import { IframeService } from './iframe.service';

const allowedOrigin = 'http://drevo-local.ru';

describe('IframeService - Browser Platform', () => {
    let spectator: SpectatorService<IframeService>;
    const createService = createServiceFactory({
        service: IframeService,
        providers: [
            {
                provide: WINDOW,
                useValue: window,
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
        expect(window.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should emit article when receiving valid message', done => {
        const testContent = 'Test content';

        spectator.service.content$.subscribe(content => {
            expect(content).toEqual(testContent);
            done();
        });

        window.dispatchEvent(
            new MessageEvent('message', {
                data: { action: 'loadContent', content: testContent },
                origin: allowedOrigin,
            }),
        );
    });

    it('should not emit article if origin is not allowed', done => {
        const spy = jest.fn();
        spectator.service.content$.subscribe(spy);

        window.dispatchEvent(
            new MessageEvent('message', {
                data: { article: { content: 'Should not emit' } },
                origin: 'http://notallowed.com',
            }),
        );

        setTimeout(() => {
            expect(spy).not.toHaveBeenCalled();
            done();
        }, 50);
    });

    it('should not emit article if event data is invalid', done => {
        const spy = jest.fn();
        spectator.service.content$.subscribe(spy);

        window.dispatchEvent(
            new MessageEvent('message', {
                data: {},
                origin: allowedOrigin,
            }),
        );

        setTimeout(() => {
            expect(spy).not.toHaveBeenCalled();
            done();
        }, 50);
    });

    it('should not emit article if loadContent carries no string content', done => {
        const spy = jest.fn();
        spectator.service.content$.subscribe(spy);

        window.dispatchEvent(
            new MessageEvent('message', {
                data: { action: 'loadContent', content: { html: 'Should not emit' } },
                origin: allowedOrigin,
            }),
        );

        setTimeout(() => {
            expect(spy).not.toHaveBeenCalled();
            done();
        }, 50);
    });

    it('should ignore a csrf token that is not a string', done => {
        window.dispatchEvent(
            new MessageEvent('message', {
                data: { action: 'loadContent', content: 'Test content', csrf: 42 },
                origin: allowedOrigin,
            }),
        );

        spectator.service.csrfToken$.subscribe(token => {
            expect(token).toBeUndefined();
            done();
        });
    });

    it('should emit insertTag command when the payload is complete', done => {
        const command = { tagOpen: '[b]', tagClose: '[/b]', sampleText: 'текст' };

        spectator.service.insertTag$.subscribe(received => {
            expect(received).toEqual(command);
            done();
        });

        window.dispatchEvent(
            new MessageEvent('message', {
                data: { action: 'insertTag', content: command },
                origin: allowedOrigin,
            }),
        );
    });

    it('should not emit insertTag command when the payload is incomplete', done => {
        const spy = jest.fn();
        spectator.service.insertTag$.subscribe(spy);

        window.dispatchEvent(
            new MessageEvent('message', {
                data: { action: 'insertTag', content: { tagOpen: '[b]' } },
                origin: allowedOrigin,
            }),
        );

        setTimeout(() => {
            expect(spy).not.toHaveBeenCalled();
            done();
        }, 50);
    });

    it('should remove event listener on destroy', () => {
        spectator.service.ngOnDestroy();
        expect(window.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    describe('outbound target origin', () => {
        let postMessage: jest.SpyInstance;

        beforeEach(() => {
            postMessage = jest.spyOn(window.parent, 'postMessage').mockImplementation(() => undefined);
        });

        const receiveFromHost = (origin: string, source: MessageEventSource | undefined = window.parent): void => {
            window.dispatchEvent(
                new MessageEvent('message', {
                    data: { action: 'loadContent', content: 'x' },
                    origin,
                    source,
                }),
            );
        };

        it('should broadcast the ready ping before the host has identified itself', () => {
            spectator.service.announceReady();

            expect(postMessage).toHaveBeenCalledWith({ action: 'editorReady' }, '*');
        });

        it('should send to the host origin once a valid message has arrived', () => {
            receiveFromHost(allowedOrigin);

            spectator.service.sendMessage({ action: 'contentChanged', content: 'draft' });

            expect(postMessage).toHaveBeenCalledWith({ action: 'contentChanged', content: 'draft' }, allowedOrigin);
        });

        it('should keep the first host origin when a later allowlisted message carries another', () => {
            receiveFromHost(allowedOrigin);
            receiveFromHost('https://staging.drevo-info.ru');

            spectator.service.sendMessage({ action: 'contentChanged', content: 'draft' });

            expect(postMessage).toHaveBeenCalledWith({ action: 'contentChanged', content: 'draft' }, allowedOrigin);
        });

        it('should not send anything before the host has identified itself', () => {
            spectator.service.sendMessage({ action: 'contentChanged', content: 'draft' });

            expect(postMessage).not.toHaveBeenCalled();
        });

        it('should not send when the only inbound message came from a disallowed origin', () => {
            receiveFromHost('http://notallowed.com');

            spectator.service.sendMessage({ action: 'contentChanged', content: 'draft' });

            expect(postMessage).not.toHaveBeenCalled();
        });

        it('should not send when an allowlisted message came from a window other than the parent', () => {
            const frame = document.createElement('iframe');
            document.body.appendChild(frame);

            receiveFromHost(allowedOrigin, frame.contentWindow ?? undefined);

            spectator.service.sendMessage({ action: 'contentChanged', content: 'draft' });

            expect(postMessage).not.toHaveBeenCalled();

            frame.remove();
        });

        it('should not send when the parent message carries no action', () => {
            window.dispatchEvent(
                new MessageEvent('message', {
                    data: {},
                    origin: allowedOrigin,
                    source: window.parent,
                }),
            );

            spectator.service.sendMessage({ action: 'contentChanged', content: 'draft' });

            expect(postMessage).not.toHaveBeenCalled();
        });
    });
});

describe('IframeService — Non-Browser Platform', () => {
    let spectator: SpectatorService<IframeService>;
    const createService = createServiceFactory({
        service: IframeService,
        providers: [
            {
                provide: WINDOW,
                useValue: undefined,
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
