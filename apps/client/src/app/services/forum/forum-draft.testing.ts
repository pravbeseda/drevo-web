import { ForumDraftService } from './forum-draft.service';
import { Provider, signal } from '@angular/core';

/** A draft store holding `drafts`, with fresh mocks per test; the topic list and the composer inject it. */
export function mockForumDraftProvider(drafts: ReadonlyMap<number, string> = new Map()): Provider {
    return {
        provide: ForumDraftService,
        useFactory: () => ({
            drafts: signal(drafts).asReadonly(),
            get: jest.fn().mockResolvedValue(undefined),
            edit: jest.fn(),
            save: jest.fn().mockResolvedValue(undefined),
        }),
    };
}
