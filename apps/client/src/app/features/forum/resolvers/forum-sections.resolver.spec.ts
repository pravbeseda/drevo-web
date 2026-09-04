import { resolveForumSections } from './forum-sections.resolver';
import { ForumService } from '../../../services/forum/forum.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Logger } from '@drevo-web/core';
import { ForumSection } from '@drevo-web/shared';
import { of, throwError } from 'rxjs';

describe('resolveForumSections', () => {
    const sections: readonly ForumSection[] = [{ id: 'common', name: 'Общий', description: 'Обо всём' }];

    let forumService: jest.Mocked<Pick<ForumService, 'getSections'>>;
    let logger: jest.Mocked<Pick<Logger, 'error'>>;

    beforeEach(() => {
        forumService = { getSections: jest.fn().mockReturnValue(of(sections)) };
        logger = { error: jest.fn() };
    });

    const resolve = (): unknown => {
        let result: unknown;
        resolveForumSections(forumService as unknown as ForumService, logger as unknown as Logger).subscribe(
            value => (result = value),
        );
        return result;
    };

    it('loads the sections', () => {
        expect(resolve()).toBe(sections);
        expect(forumService.getSections).toHaveBeenCalledWith();
    });

    it('answers not-found when the API answers 404', () => {
        forumService.getSections.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' })),
        );

        expect(resolve()).toBe('not-found');
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('answers load-error when the request fails for any other reason', () => {
        forumService.getSections.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })),
        );

        expect(resolve()).toBe('load-error');
    });

    it('answers load-error when the request fails without an HTTP response', () => {
        forumService.getSections.mockReturnValue(throwError(() => new Error('Network error')));

        expect(resolve()).toBe('load-error');
    });

    it('reports the failure that produced the load-error', () => {
        const failure = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
        forumService.getSections.mockReturnValue(throwError(() => failure));

        resolve();

        // The error itself is the payload, so its stack reaches Sentry intact.
        expect(logger.error).toHaveBeenCalledWith('Failed to load the forum sections', failure);
    });
});
