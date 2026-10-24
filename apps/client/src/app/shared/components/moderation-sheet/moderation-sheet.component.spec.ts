import { ArticleService } from '../../../services/articles/article.service';
import { CheckReport, CheckReportItem } from '../../models/check-report.model';
import { VersionForModeration } from '../../models/version-for-moderation.model';
import { ArticleModerationPanelComponent } from '../article-moderation-panel/article-moderation-panel.component';
import { CmDiffEditorComponent } from '../cm-diff-editor/cm-diff-editor.component';
import { HttpErrorResponse } from '@angular/common/http';
import { createComponentFactory, mockProvider, Spectator, SpyObject } from '@ngneat/spectator/jest';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { NotificationService, WINDOW } from '@drevo-web/core';
import { ApprovalStatus, ArticleVersion, ModerationResult, VersionForDiff } from '@drevo-web/shared';
import { MODAL_DATA } from '@drevo-web/ui/modal';
import { Observable, of, throwError } from 'rxjs';
import { ModerationSheetComponent } from './moderation-sheet.component';

const version: VersionForModeration = {
    versionId: 200,
    author: 'ivan_p',
    date: new Date('2026-10-24T14:05:00'),
    approved: ApprovalStatus.Pending,
    comment: '',
};

function diffVersion(versionId: number, content: string): VersionForDiff {
    return { ...version, versionId, articleId: 1, content, title: 'Сергий', info: '' };
}

function articleVersion(content: string): ArticleVersion {
    return { ...diffVersion(200, content), redirect: false, new: true, topics: [] };
}

function item(from: number, isChanged: boolean): CheckReportItem {
    return {
        from,
        to: from + 3,
        message: 'Сообщение',
        ruleId: 'repeated-word',
        category: 'spelling',
        level: 'serious',
        fragment: 'и и',
        line: 1,
        isChanged,
        contextBefore: '',
        contextAfter: '',
    };
}

const changedItem = item(0, true);
const unchangedItem = item(10, false);
const report: CheckReport = {
    scope: 'full',
    items: [changedItem, unchangedItem],
    verdict: 'serious',
    counts: { serious: 2, fix: 0, hint: 0 },
};

describe('ModerationSheetComponent', () => {
    let spectator: Spectator<ModerationSheetComponent>;
    let articleService: SpyObject<ArticleService>;
    const close = jest.fn();
    const twoVersions = (): Observable<unknown> =>
        of({ current: diffVersion(200, 'новый текст'), previous: diffVersion(199, 'старый текст') });

    const createComponent = createComponentFactory({
        component: ModerationSheetComponent,
        providers: [mockLoggerProvider(), mockProvider(NotificationService)],
        detectChanges: false,
    });

    const panel = (): ArticleModerationPanelComponent | null => spectator.query(ArticleModerationPanelComponent);
    const editor = (): CmDiffEditorComponent | null => spectator.query(CmDiffEditorComponent);

    function create(
        options: { pairs?: Observable<unknown>; version?: Observable<unknown>; narrow?: boolean } = {},
    ): void {
        spectator = createComponent({
            providers: [
                { provide: MODAL_DATA, useValue: { data: { version }, close } },
                mockProvider(ArticleService, {
                    getVersionPairs: jest.fn(() => options.pairs ?? twoVersions()),
                    getArticleVersion: jest.fn(() => options.version ?? of(articleVersion(''))),
                }),
                {
                    provide: WINDOW,
                    useValue: {
                        matchMedia: () => ({
                            matches: options.narrow ?? false,
                            addEventListener: jest.fn(),
                            removeEventListener: jest.fn(),
                        }),
                    },
                },
            ],
        });
        articleService = spectator.inject(ArticleService);
    }

    beforeEach(() => close.mockReset());

    it('should load the texts of the version and hand them to the editor and the panel', () => {
        create();
        spectator.detectChanges();

        expect(articleService.getVersionPairs).toHaveBeenCalledWith(200);
        expect(panel()?.version()).toBe(version);
        expect(panel()?.texts()).toEqual({ current: 'новый текст', previous: 'старый текст' });
        expect(editor()?.oldText()).toBe('старый текст');
        expect(editor()?.newText()).toBe('новый текст');
        expect(editor()?.mode()).toBe('unified');
    });

    it('should show a first version as source, with no diff modes', () => {
        create({
            pairs: throwError(
                () => new HttpErrorResponse({ error: { errorCode: 'NO_PREVIOUS_VERSION' }, status: 404 }),
            ),
            version: of(articleVersion('первый текст')),
        });
        spectator.detectChanges();

        expect(articleService.getArticleVersion).toHaveBeenCalledWith(200);
        expect(panel()?.texts()).toEqual({ current: 'первый текст', previous: undefined });
        expect(editor()?.mode()).toBe('source');
        expect(spectator.query('[data-testid="toggle-unified"]')).toBeNull();
    });

    it('should normalise CRLF line endings of a first version, as the diff endpoint does', () => {
        create({
            pairs: throwError(
                () => new HttpErrorResponse({ error: { errorCode: 'NO_PREVIOUS_VERSION' }, status: 404 }),
            ),
            version: of(articleVersion('первая строка\r\nвторая строка')),
        });
        spectator.detectChanges();

        expect(panel()?.texts()?.current).toBe('первая строка\nвторая строка');
    });

    it('should report a failed load and still let the moderator decide', () => {
        create({ pairs: throwError(() => new HttpErrorResponse({ status: 500 })) });
        spectator.detectChanges();

        expect(spectator.query('[data-testid="moderation-sheet-error"]')).toHaveText(
            'Не удалось загрузить текст версии',
        );
        expect(editor()).toBeNull();
        expect(panel()?.texts()).toBeUndefined();
    });

    it('should switch the editor between the three modes', () => {
        create();
        spectator.detectChanges();

        spectator.click('[data-testid="toggle-side-by-side"]');
        expect(editor()?.mode()).toBe('side-by-side');

        spectator.click('[data-testid="toggle-source"]');
        expect(editor()?.mode()).toBe('source');
    });

    it('should mark the findings of the latest report', () => {
        create();
        spectator.detectChanges();

        spectator.triggerEventHandler(ArticleModerationPanelComponent, 'reportChanged', report);
        spectator.detectChanges();

        expect(editor()?.marks()).toEqual(report.items);
    });

    it('should focus a selected finding and keep the unchanged lines collapsed for a changed one', () => {
        create();
        spectator.detectChanges();

        spectator.triggerEventHandler(ArticleModerationPanelComponent, 'findingSelected', changedItem);
        spectator.detectChanges();

        expect(editor()?.focused()).toBe(changedItem);
        expect(editor()?.collapseUnchanged()).toBe(true);
    });

    it('should expand the unchanged lines to show a finding among them', () => {
        create();
        spectator.detectChanges();

        spectator.triggerEventHandler(ArticleModerationPanelComponent, 'findingSelected', unchangedItem);
        spectator.detectChanges();

        expect(editor()?.collapseUnchanged()).toBe(false);
    });

    it('should close with the result of the decision', () => {
        const result: ModerationResult = {
            versionId: 200,
            articleId: 1,
            approved: ApprovalStatus.Approved,
            comment: '',
        };
        create();
        spectator.detectChanges();

        spectator.triggerEventHandler(ArticleModerationPanelComponent, 'moderated', result);

        expect(close).toHaveBeenCalledWith(result);
    });

    it('should close without a result', () => {
        create();
        spectator.detectChanges();

        spectator.click('[data-testid="moderation-sheet-close"]');

        expect(close).toHaveBeenCalledWith();
    });

    describe('on a wide screen', () => {
        it('should show the text and the decision side by side, without tabs', () => {
            create();
            spectator.detectChanges();

            expect(spectator.query('[data-testid="moderation-sheet-tabs"]')).toBeNull();
            expect(spectator.query('[data-testid="moderation-sheet-text"]')).not.toHaveClass(
                'moderation-sheet-pane--hidden',
            );
            expect(spectator.query('[data-testid="moderation-sheet-decision"]')).not.toHaveClass(
                'moderation-sheet-pane--hidden',
            );
        });
    });

    describe('on a narrow screen', () => {
        beforeEach(() => {
            create({ narrow: true });
            spectator.detectChanges();
        });

        it('should open on the decision tab and offer no two-column mode', () => {
            expect(spectator.query('[data-testid="moderation-sheet-text"]')).toHaveClass(
                'moderation-sheet-pane--hidden',
            );
            expect(spectator.query('[data-testid="toggle-side-by-side"]')).toBeNull();
        });

        it('should switch to the text when a finding is shown in it, and back', () => {
            spectator.triggerEventHandler(ArticleModerationPanelComponent, 'findingSelected', changedItem);
            spectator.detectChanges();

            expect(spectator.query('[data-testid="moderation-sheet-text"]')).not.toHaveClass(
                'moderation-sheet-pane--hidden',
            );
            expect(spectator.query('[data-testid="moderation-sheet-decision"]')).toHaveClass(
                'moderation-sheet-pane--hidden',
            );

            spectator.click('[data-testid="moderation-sheet-tab-decision"]');

            expect(spectator.query('[data-testid="moderation-sheet-decision"]')).not.toHaveClass(
                'moderation-sheet-pane--hidden',
            );
        });
    });
});
