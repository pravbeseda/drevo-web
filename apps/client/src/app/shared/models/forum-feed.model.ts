import { ForumMessage } from '@drevo-web/shared';

/** A message as the topic's chat feed lays it out. */
export interface ForumFeedItem {
    readonly message: ForumMessage;
    /** The answered message, when it is among the loaded ones. */
    readonly parent: ForumMessage | undefined;
    readonly own: boolean;
    readonly seriesStart: boolean;
    readonly seriesEnd: boolean;
    /** The day heading shown above the first message of that day. */
    readonly day: string | undefined;
}
