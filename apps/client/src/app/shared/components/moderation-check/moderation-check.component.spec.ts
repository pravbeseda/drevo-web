import { ArticleService } from '../../../services/articles/article.service';
import { ClipboardService } from '../../../services/clipboard/clipboard.service';
import { HttpErrorResponse } from '@angular/common/http';
import { createComponentFactory, mockProvider, Spectator, SpyObject } from '@ngneat/spectator/jest';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { NotificationService } from '@drevo-web/core';
import { ApprovalStatus, ArticleVersion, VersionForDiff, VersionPairs } from '@drevo-web/shared';
import { of, throwError } from 'rxjs';
import { ModerationCheckComponent } from './moderation-check.component';

function diffVersion(versionId: number, content: string): VersionForDiff {
    return {
        articleId: 1,
        versionId,
        content,
        author: 'Автор',
        date: new Date('2026-10-24T10:00:00'),
        title: 'Сергий Радонежский',
        info: '',
        approved: ApprovalStatus.Pending,
        comment: '',
    };
}

function pairs(current: string, previous: string): VersionPairs {
    return { current: diffVersion(200, current), previous: diffVersion(199, previous) };
}

function articleVersion(content: string): ArticleVersion {
    return {
        ...diffVersion(200, content),
        redirect: false,
        new: true,
        topics: [],
    };
}

const PREVIOUS = 'Старая строка, ихний дом.';
const CURRENT = 'Старая строка, ихний дом.\nНовая строка, ихнего сына (без пары.';

describe('ModerationCheckComponent', () => {
    let spectator: Spectator<ModerationCheckComponent>;
    let articleService: SpyObject<ArticleService>;
    let clipboard: SpyObject<ClipboardService>;
    let notification: SpyObject<NotificationService>;

    const createComponent = createComponentFactory({
        component: ModerationCheckComponent,
        providers: [
            mockLoggerProvider(),
            mockProvider(ArticleService),
            mockProvider(ClipboardService),
            mockProvider(NotificationService),
        ],
        detectChanges: false,
    });

    const items = (): readonly string[] =>
        spectator.queryAll('[data-testid="moderation-check-item"]').map(el => el.textContent ?? '');

    beforeEach(() => {
        spectator = createComponent({ props: { versionId: 200 } });
        articleService = spectator.inject(ArticleService);
        clipboard = spectator.inject(ClipboardService);
        notification = spectator.inject(NotificationService);
        articleService.getVersionPairs.mockReturnValue(of(pairs(CURRENT, PREVIOUS)));
        clipboard.copy.mockReturnValue(of(undefined));
        spectator.detectChanges();
    });

    it('shows the version as not checked before a run', () => {
        expect(spectator.query('[data-testid="moderation-check-verdict"]')).toHaveText('Не проверено');
        expect(items()).toEqual([]);
    });

    it('checks the whole text and shows the verdict and the cards', () => {
        spectator.click('[data-testid="moderation-check-full"]');

        expect(articleService.getVersionPairs).toHaveBeenCalledWith(200);
        expect(spectator.query('[data-testid="moderation-check-verdict"]')).toHaveText('Серьёзные замечания');
        expect(items()).toHaveLength(3);
        expect(items()[0]).toContain('Старая строка, ихний дом.');
        expect(items()[0]).toContain('→ их');
    });

    it('checks only the lines this version changed', () => {
        spectator.click('[data-testid="moderation-check-changes"]');

        expect(items()).toHaveLength(2);
        expect(items().every(text => text.includes('строка 2'))).toBe(true);
    });

    it('checks the whole text of a first version, which has no previous one', () => {
        articleService.getVersionPairs.mockReturnValue(
            throwError(() => new HttpErrorResponse({ error: { errorCode: 'NO_PREVIOUS_VERSION' }, status: 404 })),
        );
        articleService.getArticleVersion.mockReturnValue(of(articleVersion(CURRENT)));

        spectator.click('[data-testid="moderation-check-changes"]');

        expect(articleService.getArticleVersion).toHaveBeenCalledWith(200);
        expect(items()).toHaveLength(3);
    });

    it('reports a failed load and shows no verdict', () => {
        articleService.getVersionPairs.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

        spectator.click('[data-testid="moderation-check-full"]');

        expect(notification.error).toHaveBeenCalledWith('Не удалось загрузить текст версии');
        expect(spectator.query('[data-testid="moderation-check-verdict"]')).toHaveText('Не проверено');
    });

    it('adds one finding to the comment and marks its card', () => {
        const emitted: (readonly string[])[] = [];
        spectator.output('commentLinesAdded').subscribe(lines => emitted.push(lines));
        spectator.click('[data-testid="moderation-check-full"]');

        spectator.click('[data-testid="moderation-check-add"]');

        expect(emitted).toEqual([['Строка 1: «ихний» → «их» — «Ихний» — просторечие, правильно «их»']]);
        expect(spectator.query('[data-testid="moderation-check-add"]')).toHaveText('В комментарии');
    });

    it('adds the findings not yet added when all go to the comment', () => {
        const emitted: (readonly string[])[] = [];
        spectator.output('commentLinesAdded').subscribe(lines => emitted.push(lines));
        spectator.click('[data-testid="moderation-check-full"]');
        spectator.click('[data-testid="moderation-check-add"]');

        spectator.click('[data-testid="moderation-check-add-all"]');

        expect(emitted[1]).toHaveLength(2);
        expect(emitted[1][1]).toBe('Строка 2: «(» — Нет закрывающей скобки )');
    });

    it('copies a finding', () => {
        spectator.click('[data-testid="moderation-check-full"]');

        spectator.click('[data-testid="moderation-check-copy"]');

        expect(clipboard.copy).toHaveBeenCalledWith('Строка 1: «ихний» → «их» — «Ихний» — просторечие, правильно «их»');
        expect(notification.success).toHaveBeenCalledWith('Замечание скопировано');
    });

    it('drops the report when another version comes in', () => {
        spectator.click('[data-testid="moderation-check-full"]');

        spectator.setInput('versionId', 201);
        spectator.detectChanges();

        expect(spectator.query('[data-testid="moderation-check-verdict"]')).toHaveText('Не проверено');
        expect(items()).toEqual([]);
    });
});
