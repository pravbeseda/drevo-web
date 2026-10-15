import { AuthService } from '../auth/auth.service';
import { inject, Injectable, Signal, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Draft, DraftStorageService, LoggerService } from '@drevo-web/core';
import { catchError, debounceTime, distinctUntilChanged, from, map, Observable, of, Subject, switchMap } from 'rxjs';

export const FORUM_DRAFT_SAVE_DEBOUNCE_MS = 3000;

const ROUTE_PREFIX = '/forum/topic/';

interface PendingEdit {
    readonly topicId: number;
    readonly text: string;
}

function draftRoute(topicId: number): string {
    return `${ROUTE_PREFIX}${topicId}`;
}

function topicDrafts(drafts: readonly Draft[]): ReadonlyMap<number, string> {
    return new Map(
        drafts
            .filter(draft => draft.route.startsWith(ROUTE_PREFIX))
            .map(draft => [Number(draft.route.slice(ROUTE_PREFIX.length)), draft.text]),
    );
}

/**
 * The reply a reader has started in each topic and left unsent. The topic
 * list marks the topics that hold one; the composer brings it back.
 */
@Injectable({ providedIn: 'root' })
export class ForumDraftService {
    private readonly storage = inject(DraftStorageService);
    private readonly logger = inject(LoggerService).withContext('ForumDraftService');

    private readonly _drafts = signal<ReadonlyMap<number, string>>(new Map());
    private readonly editSubject = new Subject<void>();
    private pending: PendingEdit | undefined;
    /** Writes run one after another, so a later one never lands before an earlier one. */
    private writes: Promise<void> = Promise.resolve();

    /** The draft text by topic id. */
    readonly drafts: Signal<ReadonlyMap<number, string>> = this._drafts.asReadonly();

    constructor() {
        inject(AuthService)
            .user$.pipe(
                map(user => user?.login),
                distinctUntilChanged(),
                switchMap(login => (login === undefined ? of([]) : this.loadAll())),
                takeUntilDestroyed(),
            )
            .subscribe(drafts => this._drafts.set(topicDrafts(drafts)));

        this.editSubject
            .pipe(debounceTime(FORUM_DRAFT_SAVE_DEBOUNCE_MS), takeUntilDestroyed())
            .subscribe(() => void this.savePending());
    }

    async get(topicId: number): Promise<string | undefined> {
        try {
            const draft = await this.storage.getByRoute(draftRoute(topicId));
            return draft?.text;
        } catch (error: unknown) {
            this.logger.error('Failed to read a draft', error);
            return undefined;
        }
    }

    /** The reader is typing: the text is stored once they pause. */
    edit(topicId: number, text: string): void {
        if (this.pending && this.pending.topicId !== topicId) {
            void this.savePending();
        }
        this.pending = { topicId, text };
        this.editSubject.next();
    }

    /** Stores the text at once, superseding a pending edit; a blank one deletes the draft. */
    save(topicId: number, text: string): Promise<void> {
        if (this.pending?.topicId === topicId) {
            this.pending = undefined;
        }
        this.writes = this.writes.then(() => this.write(topicId, text));
        return this.writes;
    }

    private async write(topicId: number, text: string): Promise<void> {
        const hasText = text.trim().length > 0;
        if (this._drafts().get(topicId) === (hasText ? text : undefined)) {
            return;
        }

        const route = draftRoute(topicId);
        try {
            if (hasText) {
                await this.storage.save({ route, title: '', text });
            } else {
                await this.storage.deleteByRoute(route);
            }
        } catch (error: unknown) {
            this.logger.error('Failed to store a draft', error);
            return;
        }

        this._drafts.update(drafts => {
            const next = new Map(drafts);
            if (hasText) {
                next.set(topicId, text);
            } else {
                next.delete(topicId);
            }
            return next;
        });
    }

    private savePending(): Promise<void> {
        const { pending } = this;
        return pending ? this.save(pending.topicId, pending.text) : Promise.resolve();
    }

    private loadAll(): Observable<readonly Draft[]> {
        return from(this.storage.getAll()).pipe(
            catchError((error: unknown) => {
                this.logger.error('Failed to load the drafts', error);
                return of([]);
            }),
        );
    }
}
