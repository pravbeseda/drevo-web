import { isPageContentPath, primaryPath } from './content-tab';
import { provideRouter, Router } from '@angular/router';
import { createServiceFactory } from '@ngneat/spectator/jest';

describe('primaryPath', () => {
    const createRouter = createServiceFactory({ service: Router, providers: [provideRouter([])] });

    it('reads the path the primary outlet shows, without the query or the fragment', () => {
        const router = createRouter().service;

        expect(primaryPath(router, '/news/7/version/70?x=1#top')).toBe('news/7/version/70');
    });

    it('reads nothing at the root', () => {
        const router = createRouter().service;

        expect(primaryPath(router, '/')).toBeUndefined();
    });
});

describe('isPageContentPath', () => {
    it('counts the page itself and its versions as its content', () => {
        expect(isPageContentPath('news/7', '/news/7')).toBe(true);
        expect(isPageContentPath('news/7/version/70', '/news/7')).toBe(true);
    });

    it('does not count the other tabs', () => {
        expect(isPageContentPath('news/7/history', '/news/7')).toBe(false);
        expect(isPageContentPath('news/7/forum', '/news/7')).toBe(false);
    });

    it('does not count another page whose id starts the same', () => {
        expect(isPageContentPath('news/70', '/news/7')).toBe(false);
    });
});
