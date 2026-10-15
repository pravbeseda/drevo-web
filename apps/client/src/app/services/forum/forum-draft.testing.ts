import { ForumDraftService } from './forum-draft.service';
import { Provider, signal } from '@angular/core';

/**
 * A draft store holding `drafts`, with fresh mocks per test; the topic list and the composer inject it.
 * `save` marks the topic like a successful write; replace its implementation to stand for a failed one.
 */
export function mockForumDraftProvider(drafts: ReadonlyMap<number, string> = new Map()): Provider {
    return {
        provide: ForumDraftService,
        useFactory: () => {
            const stored = signal(drafts);
            const save = jest.fn((topicId: number, text: string): Promise<void> => {
                stored.update(current => {
                    const next = new Map(current);
                    if (text.trim()) {
                        next.set(topicId, text);
                    } else {
                        next.delete(topicId);
                    }
                    return next;
                });
                return Promise.resolve();
            });
            return {
                drafts: stored.asReadonly(),
                get: jest.fn().mockResolvedValue(undefined),
                edit: jest.fn(),
                save,
            };
        },
    };
}
