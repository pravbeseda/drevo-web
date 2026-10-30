import { ForumReadService } from './forum-read.service';
import { isSignal, Provider, signal, Signal } from '@angular/core';
import { ForumReadState } from '@drevo-web/shared';

/**
 * A read store holding `states`, with fresh mocks per test; the topic list and the topic page inject it.
 * Pass a signal to change the states while the test runs.
 */
export function mockForumReadProvider(
    states: ReadonlyMap<number, ForumReadState> | Signal<ReadonlyMap<number, ForumReadState>> = new Map(),
): Provider {
    return {
        provide: ForumReadService,
        useFactory: () => ({
            states: isSignal(states) ? states : signal(states).asReadonly(),
            markSeen: jest.fn(),
            forget: jest.fn(),
        }),
    };
}
