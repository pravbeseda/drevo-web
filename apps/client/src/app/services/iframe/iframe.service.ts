import { Inject, Injectable, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, ReplaySubject } from 'rxjs';
import { Article } from '@drevo-web/shared';

const allowedOrigins = ['http://drevo-local.ru', 'https://drevo-info.ru'];

@Injectable()
export class IframeService implements OnDestroy {
    private readonly messageHandler = (event: MessageEvent): void => this.onMessage(event);
    private isBrowser = false;
    private readonly articleSubject = new ReplaySubject<Article>(1);

    public readonly article$: Observable<Article> = this.articleSubject.asObservable();

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

    private onMessage(event: MessageEvent): void {
        if (!allowedOrigins.includes(event.origin)) {
            return;
        }
        if (!event.data || typeof event.data.article === 'undefined') {
            return;
        }

        this.articleSubject.next(event.data.article);
    }
}
