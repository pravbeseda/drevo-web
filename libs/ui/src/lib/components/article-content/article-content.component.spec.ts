import { Router } from '@angular/router';
import {
    createComponentFactory,
    Spectator,
} from '@ngneat/spectator/jest';
import { ArticleContentComponent } from './article-content.component';

describe('ArticleContentComponent', () => {
    let spectator: Spectator<ArticleContentComponent>;
    let router: jest.Mocked<Router>;

    const createComponent = createComponentFactory({
        component: ArticleContentComponent,
        mocks: [Router],
    });

    beforeEach(() => {
        spectator = createComponent();
        router = spectator.inject(Router) as jest.Mocked<Router>;
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    describe('content rendering', () => {
        it('should render HTML content', () => {
            spectator.setInput('content', '<p>Test content</p>');
            spectator.detectChanges();

            expect(spectator.query('p')).toHaveText('Test content');
        });

        it('should render links in content', () => {
            spectator.setInput(
                'content',
                '<a href="/articles/123">Article Link</a>'
            );
            spectator.detectChanges();

            const link = spectator.query('a') as HTMLAnchorElement;
            expect(link).toBeTruthy();
            expect(link.href).toContain('/articles/123');
        });
    });

    describe('internal link navigation', () => {
        it('should navigate using router for internal links', () => {
            spectator.setInput(
                'content',
                '<a href="/articles/123">Article Link</a>'
            );
            spectator.detectChanges();

            const link = spectator.query('a') as HTMLAnchorElement;
            link.click();

            expect(router.navigateByUrl).toHaveBeenCalledWith('/articles/123');
        });

        it('should prevent default browser navigation for internal links', () => {
            spectator.setInput(
                'content',
                '<a href="/articles/456">Article Link</a>'
            );
            spectator.detectChanges();

            const link = spectator.query('a') as HTMLAnchorElement;
            const event = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
            });
            const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

            link.dispatchEvent(event);

            expect(preventDefaultSpy).toHaveBeenCalled();
        });

        it('should handle nested elements inside links', () => {
            spectator.setInput(
                'content',
                '<a href="/articles/789"><span>Nested Text</span></a>'
            );
            spectator.detectChanges();

            const span = spectator.query('span') as HTMLSpanElement;
            span.click();

            expect(router.navigateByUrl).toHaveBeenCalledWith('/articles/789');
        });
    });

    describe('external link handling', () => {
        it('should not intercept external http links', () => {
            spectator.setInput(
                'content',
                '<a href="https://example.com">External</a>'
            );
            spectator.detectChanges();

            const link = spectator.query('a') as HTMLAnchorElement;
            link.click();

            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });

        it('should not intercept mailto links', () => {
            spectator.setInput(
                'content',
                '<a href="mailto:test@example.com">Email</a>'
            );
            spectator.detectChanges();

            const link = spectator.query('a') as HTMLAnchorElement;
            link.click();

            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });

        it('should not intercept hash-only links', () => {
            spectator.setInput('content', '<a href="/#section">Hash Link</a>');
            spectator.detectChanges();

            const link = spectator.query('a') as HTMLAnchorElement;
            link.click();

            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });
    });

    describe('non-link clicks', () => {
        it('should not intercept clicks on non-link elements', () => {
            spectator.setInput('content', '<p>Plain text</p>');
            spectator.detectChanges();

            const paragraph = spectator.query('p') as HTMLParagraphElement;
            paragraph.click();

            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });

        it('should not intercept clicks on elements without href', () => {
            spectator.setInput('content', '<a>No href</a>');
            spectator.detectChanges();

            const link = spectator.query('a') as HTMLAnchorElement;
            link.click();

            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });
    });

    describe('cleanup', () => {
        it('should remove event listener on destroy', () => {
            const removeEventListenerSpy = jest.spyOn(
                spectator.element,
                'removeEventListener'
            );

            spectator.component.ngOnDestroy();

            expect(removeEventListenerSpy).toHaveBeenCalledWith(
                'click',
                expect.any(Function)
            );
        });
    });
});
