import { ForumFeedItem } from '../models/forum-feed.model';
import { formatDateHeader, ForumMessage, isSameDay } from '@drevo-web/shared';

/** Messages of one author closer than this, on one day, read as one series. */
const SERIES_GAP_MS = 5 * 60 * 1000;

/**
 * The login is the only thing that tells one person from another: display
 * names repeat, and a guest has none, so guests never share a series.
 */
function sameAuthor(a: ForumMessage, b: ForumMessage): boolean {
    return a.author.login !== undefined && a.author.login === b.author.login;
}

function sameSeries(previous: ForumMessage | undefined, current: ForumMessage | undefined): boolean {
    const from = previous?.createdAt;
    const to = current?.createdAt;
    if (!previous || !current || !from || !to) {
        return false;
    }

    return sameAuthor(previous, current) && to.getTime() - from.getTime() < SERIES_GAP_MS && isSameDay(from, to);
}

function dayHeading(
    previous: ForumMessage | undefined,
    current: ForumMessage,
    referenceDate: Date,
): string | undefined {
    const date = current.createdAt;
    if (!date) {
        return undefined;
    }
    const previousDate = previous?.createdAt;

    return previousDate && isSameDay(previousDate, date) ? undefined : formatDateHeader(date, referenceDate);
}

/**
 * Lays the loaded messages out as a chat: which are the reader's, where each
 * author's series starts and ends, which day heads which message, and which
 * answered message a reply can quote.
 */
export function buildForumFeed(
    messages: readonly ForumMessage[],
    ownLogin: string | undefined,
    referenceDate = new Date(),
): readonly ForumFeedItem[] {
    const byId = new Map(messages.map(message => [message.id, message]));

    return messages.map((message, index) => {
        const previous = messages[index - 1];
        const next = messages[index + 1];

        return {
            message,
            parent: message.parentId === undefined ? undefined : byId.get(message.parentId),
            own: ownLogin !== undefined && message.author.login === ownLogin,
            seriesStart: !sameSeries(previous, message),
            seriesEnd: !sameSeries(message, next),
            day: dayHeading(previous, message, referenceDate),
        };
    });
}
