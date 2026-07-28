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

    /**
     * Broadcast the payload-free readiness ping — the one outbound message allowed before the
     * host is known, since it carries nothing to leak.
     */
    announceReady(): void {
        // eslint-disable-next-line sonarjs/post-message -- the target origin is unknown until the host answers this very ping, and it carries no data
        this.window?.parent.postMessage({ action: 'editorReady' }, '*');
    }

    /**
     * Send to the host, or do nothing while it has not identified itself.
     *
     * Dropping is deliberate: everything routed here carries article content, and an embedder
     * that never sends a valid message must not receive it. The alternative — broadcasting to
     * `'*'` until the host replies — would hand the draft to any page that framed the editor
     * and then stayed silent.
     */
    sendMessage(message: unknown): void {
        if (this.hostOrigin === undefined) {
            return;
        }

        this.window?.parent.postMessage(message, this.hostOrigin);
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
        // `postMessage` be dropped by the browser without a trace. Latched once, so a later
        // message cannot silently retarget everything that follows it.
        // eslint-disable-next-line sonarjs/different-types-comparison -- the rule does not expand the `WindowProxy` alias in `MessageEventSource` to `Window`, so it misreads the overlap as empty
        if (this.hostOrigin === undefined && event.source === this.window?.parent) {
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
