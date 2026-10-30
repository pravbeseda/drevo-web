import { ForumReadService } from './forum-read.service';
import { Provider, signal } from '@angular/core';
import { ForumReadState } from '@drevo-web/shared';

/** A read store holding `states`, with fresh mocks per test; the topic list and the topic page inject it. */
export function mockForumReadProvider(states: ReadonlyMap<number, ForumReadState> = new Map()): Provider {
    return {
        provide: ForumReadService,
        useFactory: () => ({
            states: signal(states).asReadonly(),
            markSeen: jest.fn(),
            forget: jest.fn(),
        }),
    };
}
