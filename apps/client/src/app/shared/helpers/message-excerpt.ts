import { htmlToText } from './html-to-text';
import { ForumMessage } from '@drevo-web/shared';

/** A quote shows one line; the rest of a long message is never on screen. */
const EXCERPT_MAX_LENGTH = 200;

/** The start of a message as one line of text, for a quote of it. */
export function messageExcerpt(message: ForumMessage, document: Document): string {
    return htmlToText(message.html, document).slice(0, EXCERPT_MAX_LENGTH);
}
