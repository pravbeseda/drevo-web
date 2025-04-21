import { Inject, Injectable, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, ReplaySubject, Subject } from 'rxjs';
import { InsertTagCommand } from '@drevo-web/shared';

const allowedOrigins = [
    'http://drevo-local.ru',
    'https://drevo-info.ru',
    'http://localhost',
];

@Injectable()
export class IframeService implements OnDestroy {
    private readonly messageHandler = (event: MessageEvent): void =>
        this.onMessage(event);
    private isBrowser = false;
    private readonly contentSubject = new ReplaySubject<string>(1);
    private readonly csrfTokenSubject = new BehaviorSubject<string | undefined>(
        undefined
    );
    private readonly insertTagSubject = new Subject<InsertTagCommand>();

    public readonly content$: Observable<string> =
        this.contentSubject.asObservable();
    public readonly csrfToken$: Observable<string | undefined> =
        this.csrfTokenSubject.asObservable();
    public readonly insertTag$ = this.insertTagSubject.asObservable();

    constructor(@Inject(PLATFORM_ID) private platformId: object) {
        this.isBrowser = isPlatformBrowser(this.platformId);
        if (this.isBrowser) {
            window.addEventListener('message', this.messageHandler);
        }
    }

    ngOnDestroy(): void {
        if (this.isBrowser) {
            window.removeEventListener('message', this.messageHandler);
        }
    }

    sendMessage(message: unknown): void {
        if (this.isBrowser) {
            window.parent.postMessage(message, '*');
        }
    }

    private onMessage(event: MessageEvent): void {
        if (!allowedOrigins.includes(event.origin)) {
            return;
        }
        if (!event.data || typeof event.data.action === 'undefined') {
            return;
        }

        switch (event.data.action) {
            case 'loadContent':
                this.contentSubject.next(event.data.content);
                this.csrfTokenSubject.next(event.data.csrf);
                break;
            case 'insertTag':
                this.insertTagSubject.next(event.data.content);
                break;
            default:
                break;
        }
    }
}
