import { Inject, Injectable, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { Article } from '@drevo-web/shared';

const allowedOrigins = ['http://drevo-local.ru', 'https://drevo-info.ru', 'http://localhost'];

@Injectable()
export class IframeService implements OnDestroy {
    private readonly messageHandler = (event: MessageEvent): void => this.onMessage(event);
    private isBrowser = false;
    private readonly articleSubject = new ReplaySubject<Article>(1);
    private readonly linksStateSubject = new Subject<Record<string, boolean>>();

    public readonly article$: Observable<Article> = this.articleSubject.asObservable();
    public readonly linksState$: Observable<Record<string, boolean>> =
        this.linksStateSubject.asObservable();

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
            window.parent.postMessage(message);
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
            case 'loadArticle':
                this.articleSubject.next(event.data.article);
                break;
            case 'updateLinks':
                this.linksStateSubject.next(event.data.links);
                break;
            default:
                break;
        }
    }
}
