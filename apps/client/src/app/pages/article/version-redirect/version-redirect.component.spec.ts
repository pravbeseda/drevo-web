import { ArticleService } from '../../../services/articles';
import { VersionRedirectComponent } from './version-redirect.component';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { ArticleVersion } from '@drevo-web/shared';
import { of, throwError } from 'rxjs';

const mockArticle: ArticleVersion = {
    articleId: 100,
    versionId: 789,
    title: 'Article',
    content: '<p>Content</p>',
    author: 'Author',
    date: new Date('2024-01-15'),
    redirect: false,
    new: false,
    approved: 1,
    info: '',
    comment: '',
};

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
                        paramMap: convertToParamMap({ id: '789' }),
                    },
                },
            },
        ],
        detectChanges: false,
    });

    beforeEach(() => {
        spectator = createComponent();
        articleService = spectator.inject(ArticleService) as jest.Mocked<ArticleService>;
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
                        paramMap: convertToParamMap({ id: 'invalid' }),
                    },
                },
            },
        ],
    });

    it('should show error for invalid ID', () => {
        const spectator = createComponent();

        expect(spectator.component.error()).toBe('Неверный ID версии');
    });
});
