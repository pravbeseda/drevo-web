import { ForumMessage } from '@drevo-web/shared';
import { buildForumFeed } from './forum-feed';

const REFERENCE_DATE = new Date(2026, 8, 24, 12, 0);
const TOPIC_ID = 100;

let nextId = 1;

function message(author: string, createdAt: Date | undefined, overrides: Partial<ForumMessage> = {}): ForumMessage {
    return {
        id: nextId++,
        parentId: undefined,
        author: { name: author, login: author.toLowerCase() },
        createdAt,
        html: '<p>Текст</p>',
        ...overrides,
    };
}

const at = (day: number, hour: number, minute: number): Date => new Date(2026, 8, day, hour, minute);

describe('buildForumFeed', () => {
    beforeEach(() => (nextId = 1));

    describe('the reader', () => {
        it('marks the messages the reader wrote as their own', () => {
            const feed = buildForumFeed(
                TOPIC_ID,
                [message('Андрей', at(12, 10, 0)), message('Мария', at(12, 11, 0))],
                'мария',
                REFERENCE_DATE,
            );

            expect(feed.map(item => item.own)).toEqual([false, true]);
        });

        it('owns nothing while the reader is unknown, not even a guest message without a login', () => {
            const guest = message('Гость', at(12, 10, 0), { author: { name: 'Гость', login: undefined } });

            expect(buildForumFeed(TOPIC_ID, [guest], undefined, REFERENCE_DATE)[0].own).toBe(false);
        });
    });

    describe('series', () => {
        it('joins consecutive messages of one author written within minutes', () => {
            const feed = buildForumFeed(
                TOPIC_ID,
                [message('Андрей', at(12, 10, 0)), message('Андрей', at(12, 10, 4)), message('Андрей', at(12, 10, 8))],
                undefined,
                REFERENCE_DATE,
            );

            expect(feed.map(item => [item.seriesStart, item.seriesEnd])).toEqual([
                [true, false],
                [false, false],
                [false, true],
            ]);
        });

        it('starts a new series once five minutes have passed', () => {
            const feed = buildForumFeed(
                TOPIC_ID,
                [message('Андрей', at(12, 10, 0)), message('Андрей', at(12, 10, 5))],
                undefined,
                REFERENCE_DATE,
            );

            expect(feed.map(item => [item.seriesStart, item.seriesEnd])).toEqual([
                [true, true],
                [true, true],
            ]);
        });

        it('keeps apart two people who share a display name', () => {
            const feed = buildForumFeed(
                TOPIC_ID,
                [
                    message('Андрей', at(12, 10, 0), { author: { name: 'Андрей', login: 'andrey' } }),
                    message('Андрей', at(12, 10, 1), { author: { name: 'Андрей', login: 'andrey2' } }),
                ],
                undefined,
                REFERENCE_DATE,
            );

            expect(feed.map(item => item.seriesStart && item.seriesEnd)).toEqual([true, true]);
        });

        it('never joins guests, since nothing tells one guest from another', () => {
            const guest = { name: 'Гость', login: undefined };
            const feed = buildForumFeed(
                TOPIC_ID,
                [
                    message('Гость', at(12, 10, 0), { author: guest }),
                    message('Гость', at(12, 10, 1), { author: guest }),
                ],
                undefined,
                REFERENCE_DATE,
            );

            expect(feed.map(item => item.seriesStart && item.seriesEnd)).toEqual([true, true]);
        });

        it('starts a new series when another author speaks', () => {
            const feed = buildForumFeed(
                TOPIC_ID,
                [message('Андрей', at(12, 10, 0)), message('Мария', at(12, 10, 1))],
                undefined,
                REFERENCE_DATE,
            );

            expect(feed.map(item => item.seriesStart && item.seriesEnd)).toEqual([true, true]);
        });

        it('starts a new series on a new day, however close the times are', () => {
            const feed = buildForumFeed(
                TOPIC_ID,
                [message('Андрей', at(12, 23, 58)), message('Андрей', at(13, 0, 1))],
                undefined,
                REFERENCE_DATE,
            );

            expect(feed.map(item => item.seriesStart && item.seriesEnd)).toEqual([true, true]);
        });

        it('leaves a message without a date on its own', () => {
            const feed = buildForumFeed(
                TOPIC_ID,
                [message('Андрей', at(12, 10, 0)), message('Андрей', undefined), message('Андрей', at(12, 10, 1))],
                undefined,
                REFERENCE_DATE,
            );

            expect(feed.map(item => item.seriesStart && item.seriesEnd)).toEqual([true, true, true]);
        });
    });

    describe('days', () => {
        it('heads the first message of every day with that day', () => {
            const feed = buildForumFeed(
                TOPIC_ID,
                [message('Андрей', at(12, 10, 0)), message('Мария', at(12, 11, 0)), message('Андрей', at(24, 9, 0))],
                undefined,
                REFERENCE_DATE,
            );

            expect(feed.map(item => item.day)).toEqual(['12 сентября', undefined, 'Сегодня']);
        });

        it('heads no message whose date is unknown', () => {
            expect(
                buildForumFeed(TOPIC_ID, [message('Андрей', undefined)], undefined, REFERENCE_DATE)[0].day,
            ).toBeUndefined();
        });
    });

    describe('replies', () => {
        it('carries the answered message along when it is loaded', () => {
            const answered = message('Андрей', at(12, 10, 0));
            const reply = message('Мария', at(12, 11, 0), { parentId: answered.id });

            expect(buildForumFeed(TOPIC_ID, [answered, reply], undefined, REFERENCE_DATE)[1].parent).toBe(answered);
        });

        it("carries nothing for a reply to the topic itself, which is how the topic's root is stored", () => {
            const root = message('Андрей', at(12, 10, 0), { id: TOPIC_ID });
            const reply = message('Мария', at(12, 11, 0), { parentId: TOPIC_ID });

            expect(buildForumFeed(TOPIC_ID, [root, reply], undefined, REFERENCE_DATE)[1]).toEqual(
                expect.objectContaining({ replyTo: undefined, parent: undefined }),
            );
        });

        it('names the answered message even when it is on a page not loaded yet', () => {
            const reply = message('Мария', at(12, 11, 0), { parentId: 999 });

            expect(buildForumFeed(TOPIC_ID, [reply], undefined, REFERENCE_DATE)[0].replyTo).toBe(999);
        });

        it('carries nothing when the answered message is on a page not loaded yet', () => {
            const reply = message('Мария', at(12, 11, 0), { parentId: 999 });

            expect(buildForumFeed(TOPIC_ID, [reply], undefined, REFERENCE_DATE)[0].parent).toBeUndefined();
        });
    });
});
