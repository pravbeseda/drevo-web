import { ArticleService } from '../../../../services/articles';
import { VersionRedirectComponent } from './version-redirect.component';
import { createMockArticle } from '../../testing/article-testing.helper';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { of, throwError } from 'rxjs';

const mockArticle = createMockArticle({ articleId: 100, versionId: 789, title: 'Article' });

describe('VersionRedirectComponent', () => {
    let spectator: Spectator<VersionRedirectComponent>;
    let articleService: jest.Mocked<ArticleService>;

    const createComponent = createComponentFactory({
        component: VersionRedirectComponent,
        providers: [
            provideRouter([{ path: '**', children: [] }]),
            mockLoggerProvider(),
            {
                provide: ArticleService,
                useValue: { getVersionShow: jest.fn() },
            },
            {
                provide: ActivatedRoute,
                useValue: {
                    snapshot: {
                        paramMap: convertToParamMap({ versionId: '789' }),
                    },
                },
            },
        ],
        detectChanges: false,
    });

    beforeEach(() => {
        spectator = createComponent();
        articleService = spectator.inject(ArticleService);
    });

    it('should create', () => {
        articleService.getVersionShow.mockReturnValue(of(mockArticle));
        spectator.detectChanges();
        expect(spectator.component).toBeTruthy();
    });

    it('should redirect to new URL format on success', () => {
        articleService.getVersionShow.mockReturnValue(of(mockArticle));
        const router = spectator.inject(Router);
        const navigateSpy = jest.spyOn(router, 'navigate');

        spectator.detectChanges();

        expect(navigateSpy).toHaveBeenCalledWith(['/articles', 100, 'version', 789], { replaceUrl: true });
    });

    it('should show 404 error', () => {
        const error = new HttpErrorResponse({ status: 404 });
        articleService.getVersionShow.mockReturnValue(throwError(() => error));
        spectator.detectChanges();

        expect(spectator.component.error()).toBe('Версия не найдена');
    });

    it('should show generic error', () => {
        const error = new HttpErrorResponse({ status: 500 });
        articleService.getVersionShow.mockReturnValue(throwError(() => error));
        spectator.detectChanges();

        expect(spectator.component.error()).toBe('Ошибка загрузки версии');
    });
});

describe('VersionRedirectComponent with invalid ID', () => {
    const createComponent = createComponentFactory({
        component: VersionRedirectComponent,
        providers: [
            provideRouter([{ path: '**', children: [] }]),
            mockLoggerProvider(),
            {
                provide: ArticleService,
                useValue: { getVersionShow: jest.fn() },
            },
            {
                provide: ActivatedRoute,
                useValue: {
                    snapshot: {
                        paramMap: convertToParamMap({ versionId: 'invalid' }),
                    },
                },
            },
        ],
    });

    it('should show error for invalid ID', () => {
        const spectator = createComponent();

        expect(spectator.component.error()).toBe('Неверный ID версии');
    });

    // parseInt() read a prefix and dropped the rest, so the first two once
    // resolved to version 42 under an address the route never names. The hex
    // form was already rejected here, by parseInt('0x2a', 10) answering 0.
    it.each([
        ['with trailing garbage', '42abc'],
        ['padded with a leading zero', '042'],
        ['hexadecimal', '0x2a'],
    ])('should show error for an ID %s, without asking the API', (_case, versionId) => {
        const articleService = { getVersionShow: jest.fn() };
        const spectator = createComponent({
            providers: [
                { provide: ArticleService, useValue: articleService },
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { paramMap: convertToParamMap({ versionId }) } },
                },
            ],
        });

        expect(spectator.component.error()).toBe('Неверный ID версии');
        expect(articleService.getVersionShow).not.toHaveBeenCalled();
    });
});
