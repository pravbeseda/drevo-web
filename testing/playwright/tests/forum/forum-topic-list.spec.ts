import { expect, mockForumSectionsApi, mockForumTopicsApi, test } from '../../fixtures';
import { getTooltip } from '../../helpers/tooltip';
import { createForumTopicListItemDto, createForumTopicListResponse } from '../../mocks/forum';
import { ForumTopicsPage } from '../../pages/forum-topics.page';

const TOPIC_TITLE = 'Тема о преподобном Сергии';
const TOPIC_AUTHOR = 'Петров Пётр Петрович';

test.describe('Forum topic list', () => {
    test('puts the author avatar left of the title and names the author in full on hover', async ({
        authenticatedPage: page,
    }) => {
        await mockForumSectionsApi(page);
        await mockForumTopicsApi(
            page,
            createForumTopicListResponse([createForumTopicListItemDto({ title: TOPIC_TITLE, author: TOPIC_AUTHOR })]),
        );
        const topics = new ForumTopicsPage(page);

        await page.goto('/forum');
        await topics.waitForReady();

        const avatarBox = await topics.avatar(TOPIC_TITLE).boundingBox();
        const titleBox = await topics.title(TOPIC_TITLE).boundingBox();
        expect(avatarBox).not.toBeNull();
        expect(titleBox).not.toBeNull();
        expect((avatarBox?.x ?? 0) + (avatarBox?.width ?? 0)).toBeLessThanOrEqual(titleBox?.x ?? 0);

        await topics.avatar(TOPIC_TITLE).hover();

        await expect(getTooltip(page)).toHaveText(TOPIC_AUTHOR);
    });
});
