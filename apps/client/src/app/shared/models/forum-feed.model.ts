import { ForumMessage } from '@drevo-web/shared';

/** A message as the topic's chat feed lays it out. */
export interface ForumFeedItem {
    readonly message: ForumMessage;
    /**
     * The id of the answered message — absent on the root and on a reply to the
     * topic itself, which is stored as a reply to the root.
     */
    readonly replyTo: number | undefined;
    /** The message `replyTo` names, when it is among the loaded ones. */
    readonly parent: ForumMessage | undefined;
    readonly own: boolean;
    readonly seriesStart: boolean;
    readonly seriesEnd: boolean;
}
