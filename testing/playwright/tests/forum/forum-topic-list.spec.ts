import { expect, mockForumSectionsApi, mockForumTopicsApi, test } from '../../fixtures';
import { getTooltip } from '../../helpers/tooltip';
import { createForumTopicListItemDto, createForumTopicListResponse } from '../../mocks/forum';
import { ForumTopicsPage } from '../../pages/forum-topics.page';
import { LayoutPage } from '../../pages/layout.page';
import { Page } from '@playwright/test';

const TOPIC_TITLE = 'Тема о преподобном Сергии';
const TOPIC_AUTHOR = 'Петров Пётр Петрович';
const AVATAR_TITLE_GAP_PX = 12;

async function openForum(page: Page): Promise<ForumTopicsPage> {
    await mockForumSectionsApi(page);
    await mockForumTopicsApi(
        page,
        createForumTopicListResponse([createForumTopicListItemDto({ title: TOPIC_TITLE, author: TOPIC_AUTHOR })]),
    );
    const topics = new ForumTopicsPage(page);
    await page.goto('/forum');
    await topics.waitForReady();
    return topics;
}

test.describe('Forum topic list', () => {
    test('puts the author avatar left of the title and names the author in full on hover', async ({
        authenticatedPage: page,
    }) => {
        const topics = await openForum(page);

        const avatarBox = await topics.avatar(TOPIC_TITLE).boundingBox();
        const titleBox = await topics.title(TOPIC_TITLE).boundingBox();
        expect(avatarBox).not.toBeNull();
        expect(titleBox).not.toBeNull();
        expect((titleBox?.x ?? 0) - (avatarBox?.x ?? 0) - (avatarBox?.width ?? 0)).toBeCloseTo(AVATAR_TITLE_GAP_PX);

        await topics.avatar(TOPIC_TITLE).hover();

        await expect(getTooltip(page)).toHaveText(TOPIC_AUTHOR);
    });

    test('scales the topic title with the reader font size', async ({ authenticatedPage: page }) => {
        const topics = await openForum(page);
        const layout = new LayoutPage(page);
        const titleFontSize = (): Promise<number> =>
            topics.title(TOPIC_TITLE).evaluate(title => parseFloat(getComputedStyle(title).fontSize));
        const defaultSize = await titleFontSize();

        await layout.openFontScalePopup();
        await layout.fontScaleIncrease.click();
        await layout.closeFontScalePopup();

        await expect.poll(titleFontSize).toBeGreaterThan(defaultSize);
    });
});
