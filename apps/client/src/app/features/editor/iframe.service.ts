import { inject, Injectable, OnDestroy } from '@angular/core';
import { WINDOW } from '@drevo-web/core';
import { InsertTagCommand } from '@drevo-web/shared';
import { BehaviorSubject, Observable, ReplaySubject, Subject } from 'rxjs';

const allowedOrigins = [
    // eslint-disable-next-line sonarjs/no-clear-text-protocols -- local dev origins are http by design
    'http://drevo-local.ru',
    'https://drevo-info.ru',
    'https://staging.drevo-info.ru',
    'https://app.drevo-info.ru',
    'http://localhost',
];

@Injectable()
export class IframeService implements OnDestroy {
    private readonly messageHandler = (event: MessageEvent): void => this.onMessage(event);
    private readonly window = inject(WINDOW);
    private readonly contentSubject = new ReplaySubject<string>(1);
    private readonly csrfTokenSubject = new BehaviorSubject<string | undefined>(undefined);
    private readonly insertTagSubject = new Subject<InsertTagCommand>();
    /** Origin of the embedding host, learned from the first valid message the parent sent. */
    private hostOrigin: string | undefined;

    public readonly content$: Observable<string> = this.contentSubject.asObservable();
    public readonly csrfToken$: Observable<string | undefined> = this.csrfTokenSubject.asObservable();
    public readonly insertTag$ = this.insertTagSubject.asObservable();

    constructor() {
        this.window?.addEventListener('message', this.messageHandler);
    }

    ngOnDestroy(): void {
        this.window?.removeEventListener('message', this.messageHandler);
    }

    sendMessage(message: unknown): void {
        // Until the host identifies itself the only outbound message is a payload-free
        // `editorReady` ping, so broadcasting that leaks nothing. Everything after it —
        // including the article draft — goes to the origin the host was accepted from.
        this.window?.parent.postMessage(message, this.hostOrigin ?? '*');
    }

    private onMessage(event: MessageEvent): void {
        if (!allowedOrigins.includes(event.origin)) {
            return;
        }

        if (!event.data || typeof event.data.action === 'undefined') {
            return;
        }

        // An allowlisted origin is not enough: any window holding a handle to this frame can
        // post to it, and pinning `hostOrigin` to a non-parent origin would make every later
        // `postMessage` be dropped by the browser without a trace.
        // eslint-disable-next-line sonarjs/different-types-comparison -- the rule does not expand the `WindowProxy` alias in `MessageEventSource` to `Window`, so it misreads the overlap as empty
        if (event.source === this.window?.parent) {
            this.hostOrigin = event.origin;
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
