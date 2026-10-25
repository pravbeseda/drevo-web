import { Page } from '@playwright/test';
import { test, expect, mockAuthApi, mockVersionPairs, bypassSsr } from '../../fixtures';
import { mockUsers } from '../../mocks';
import { createVersionPairsResponse } from '../../mocks/articles';
import { DiffPage } from '../../pages/diff.page';
import { ModerationSheetPage } from '../../pages/moderation-sheet.page';

const VERSION = 200;
const FILLER = Array.from({ length: 8 }, (_, i) => `Неизменная строка ${i + 1}.`).join('\n');
// Line 1 is unchanged and far enough from the edit to be collapsed; lines 10 and 11 are new.
const PREVIOUS = `Старый ихний дом.\n${FILLER}\nПрежняя строка.`;
const CURRENT = `Старый ихний дом.\n${FILLER}\nОн в течении года жил в Хотькове.\nБратья поставили келью и и церковь.`;

const JEV_URL = 'https://openrouter.ai/api/v1/systemone';

/** Answers Jev's spelling question with a typo for the line about Хотьково, and clean for every other line. */
async function mockJev(page: Page): Promise<string[]> {
    const states: string[] = [];
    await page.route(JEV_URL, async route => {
        const { state } = route.request().postDataJSON() as { state: string };
        states.push(state);
        const typo = state.includes('Хотькове') ? 0.9 : 0.02;
        await route.fulfill({
            headers: { 'access-control-allow-origin': '*' },
            json: {
                model: 'typesafe/jev-1.14',
                answers: {
                    spelling: {
                        type: 'choice',
                        choice: typo > 0.5 ? 'typo' : 'none',
                        confidence: 0.9,
                        probabilities: { none: 1 - typo, typo, spelling: 0 },
                    },
                },
            },
        });
    });
    return states;
}

test.describe('Moderation sheet', () => {
    let diff: DiffPage;
    let sheet: ModerationSheetPage;

    test.beforeEach(async ({ authenticatedPage: page }) => {
        await bypassSsr(page, '**/history/articles/diff/**');
        await mockAuthApi(page, mockUsers.moderator);
        await mockVersionPairs(page, VERSION, createVersionPairsResponse({ content: CURRENT }, { content: PREVIOUS }));
        diff = new DiffPage(page);
        sheet = new ModerationSheetPage(page);
        await page.goto(`/history/articles/diff/${VERSION}`);
        await diff.waitForReady();
        await diff.openMobileMenu();
        await diff.moderationAction.click();
        await sheet.waitForReady();
    });

    test.describe('on a wide screen', () => {
        test.use({ viewport: { width: 1440, height: 900 } });

        test('shows the text beside the decision', async () => {
            await expect(sheet.editor).toBeVisible();
            await expect(sheet.verdict).toHaveText('Не проверено');
            await expect(sheet.mode('side-by-side')).toBeVisible();
        });

        test('checks the whole text and marks the findings in it', async () => {
            await sheet.checkWholeText.click();

            await expect(sheet.verdict).toHaveText('Серьёзные замечания');
            await expect(sheet.findings).toHaveCount(3);
            await expect(sheet.marks.first()).toBeVisible();
        });

        test('checks only the changed lines', async () => {
            await sheet.checkChanges.click();

            await expect(sheet.findings).toHaveCount(2);
        });

        test('adds a finding to the comment', async () => {
            await sheet.checkWholeText.click();
            await sheet.addToComment(1).click();

            await expect(sheet.comment).toHaveValue(/^Прошу исправить:\nСтрока 10: «в течении» → «в течение»/);
        });

        test('shows a finding among collapsed unchanged lines', async () => {
            await sheet.checkWholeText.click();
            await sheet.showInText(0).click();

            await expect(sheet.focusedMark).toHaveText('ихний');
            await expect(sheet.focusedMark).toBeInViewport();
        });

        test('asks nothing of the AI without a key', async ({ authenticatedPage: page }) => {
            const states = await mockJev(page);

            await sheet.checkChanges.click();

            await expect(sheet.findings).toHaveCount(2);
            await expect(sheet.aiToggle).toHaveText('Подключить ИИ');
            await expect(sheet.aiProgress).toBeHidden();
            expect(states).toEqual([]);
        });

        test('adds the AI findings to the cards once a key is saved', async ({ authenticatedPage: page }) => {
            const states = await mockJev(page);

            await sheet.connectAi('sk-or-test');
            await expect(sheet.aiToggle).toHaveText('ИИ');
            await sheet.checkChanges.click();

            await expect(sheet.aiProgress).toHaveText('ИИ: 2 из 2');
            await expect(sheet.findings).toHaveCount(3);
            await expect(sheet.findings.filter({ hasText: 'ИИ · 90 %' })).toContainText('Опечатка');
            expect(states).toHaveLength(2);
            expect(states).toEqual(
                expect.arrayContaining(['Он в течении года жил в Хотькове.', 'Братья поставили келью и и церковь.']),
            );
        });

        test('keeps the marks in the source view, without the diff', async () => {
            await sheet.checkWholeText.click();
            await sheet.mode('source').click();

            await expect(sheet.deletedChunks).toHaveCount(0);
            await expect(sheet.marks).toHaveCount(3);
        });
    });

    test.describe('on a phone', () => {
        test.use({ viewport: { width: 390, height: 844 } });

        test('opens on the decision and switches to the text to show a finding', async () => {
            await expect(sheet.textPane).toBeHidden();
            await expect(sheet.decisionPane).toBeVisible();

            await sheet.checkWholeText.click();
            await sheet.showInText(2).click();

            await expect(sheet.decisionPane).toBeHidden();
            await expect(sheet.focusedMark).toHaveText('и и');
            await expect(sheet.mode('side-by-side')).toBeHidden();

            await sheet.decisionTab.click();
            await expect(sheet.findings).toHaveCount(3);
        });
    });
});
