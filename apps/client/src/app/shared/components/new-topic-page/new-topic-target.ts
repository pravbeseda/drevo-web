import { InjectionToken, Signal } from '@angular/core';

/** Where a new topic goes, as the list it is started from knows it. */
export interface NewTopicTarget {
    /** The section; absent where the list spans every one and the reader picks it. */
    readonly part: string | undefined;
    /** The article or news item the topic hangs off; absent for a plain section topic. */
    readonly partId: number | undefined;
}

/**
 * Provided by the topic list whose panel the form opens in — the router puts
 * the form under that list's injector — so the form never reads the address.
 */
export const NEW_TOPIC_TARGET = new InjectionToken<Signal<NewTopicTarget>>('NEW_TOPIC_TARGET');
