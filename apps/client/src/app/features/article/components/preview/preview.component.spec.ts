import { ArticleService } from '../../../../services/articles';
import { PreviewComponent } from './preview.component';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { of, throwError } from 'rxjs';

describe('PreviewComponent', () => {
    let spectator: Spectator<PreviewComponent>;
    let articleService: jest.Mocked<ArticleService>;

    const createComponent = createComponentFactory({
        component: PreviewComponent,
        providers: [mockLoggerProvider()],
        mocks: [ArticleService],
        detectChanges: false,
    });

    beforeEach(() => {
        spectator = createComponent({
            props: {
                content: '== Test ==\nSome wiki content',
                articleId: 42,
            },
        });
        articleService = spectator.inject(ArticleService) as jest.Mocked<ArticleService>;
    });

    it('should create', () => {
        articleService.previewArticle.mockReturnValue(of('<h2>Test</h2><p>Some wiki content</p>'));
        spectator.detectChanges();

        expect(spectator.component).toBeTruthy();
    });

    it('should be in loading state before init', () => {
        articleService.previewArticle.mockReturnValue(of('<p>Content</p>'));

        expect(spectator.component.isLoading()).toBe(true);
        expect(spectator.component.previewHtml()).toBe('');
    });

    it('should call ArticleService.previewArticle with content and articleId on init', () => {
        articleService.previewArticle.mockReturnValue(of('<p>Formatted</p>'));
        spectator.detectChanges();

        expect(articleService.previewArticle).toHaveBeenCalledWith('== Test ==\nSome wiki content', 42);
    });

    it('should display formatted content after loading', () => {
        const html = '<h2>Test</h2><p>Some wiki content</p>';
        articleService.previewArticle.mockReturnValue(of(html));
        spectator.detectChanges();

        expect(spectator.component.isLoading()).toBe(false);
        expect(spectator.component.previewHtml()).toBe(html);
        expect(spectator.query('ui-spinner')).toBeFalsy();
        expect(spectator.query('app-article-content')).toBeTruthy();
    });

    it('should show error on API failure', () => {
        articleService.previewArticle.mockReturnValue(throwError(() => new Error('Server error')));
        spectator.detectChanges();

        expect(spectator.component.isLoading()).toBe(false);
        expect(spectator.component.error()).toBe('Не удалось загрузить предпросмотр');
        expect(spectator.query('app-error')).toBeTruthy();
        expect(spectator.query('app-article-content')).toBeFalsy();
    });

    it('should not show error or content while loading', () => {
        articleService.previewArticle.mockReturnValue(of('<p>Content</p>'));

        // Before detectChanges — still in initial loading state
        expect(spectator.component.isLoading()).toBe(true);
        expect(spectator.component.error()).toBeUndefined();
        expect(spectator.component.previewHtml()).toBe('');
    });
});
