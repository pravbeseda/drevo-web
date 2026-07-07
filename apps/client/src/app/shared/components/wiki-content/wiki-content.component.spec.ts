import { PictureLightboxService } from '../../../services/pictures/picture-lightbox.service';
import { WikiContentComponent } from './wiki-content.component';
import { NavigationEnd, Router } from '@angular/router';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { NotificationService } from '@drevo-web/core';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { Subject } from 'rxjs';

describe('WikiContentComponent', () => {
    let spectator: Spectator<WikiContentComponent>;
    let router: jest.Mocked<Router>;
    let lightboxService: jest.Mocked<PictureLightboxService>;
    const routerEvents = new Subject<NavigationEnd>();

    const createComponent = createComponentFactory({
        component: WikiContentComponent,
        providers: [
            mockLoggerProvider(),
            mockProvider(PictureLightboxService),
            mockProvider(NotificationService),
            mockProvider(Router, { events: routerEvents, url: '/articles/1' }),
        ],
    });

    beforeEach(() => {
        jest.clearAllMocks();
        spectator = createComponent();
        router = spectator.inject(Router) as jest.Mocked<Router>;
        lightboxService = spectator.inject(PictureLightboxService) as jest.Mocked<PictureLightboxService>;
    });

    afterEach(() => {
        jest.restoreAllMocks();
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
            spectator.setInput('content', '<a href="/articles/123">Article Link</a>');
            spectator.detectChanges();

            const link = spectator.query('a') as HTMLAnchorElement;
            expect(link).toBeTruthy();
            expect(link.href).toContain('/articles/123');
        });

        it('should preserve id attributes in content', () => {
            spectator.setInput('content', '<div id="section1"><p>Content with ID</p></div>');
            spectator.detectChanges();

            const div = spectator.query('#section1') as HTMLDivElement;
            expect(div).toBeTruthy();
            expect(div.id).toBe('section1');
        });

        it('should preserve name attributes in anchors', () => {
            spectator.setInput('content', '<a name="anchor1">Anchor with name</a>');
            spectator.detectChanges();

            const anchor = spectator.query('a[name="anchor1"]') as HTMLAnchorElement;
            expect(anchor).toBeTruthy();
            expect(anchor.getAttribute('name')).toBe('anchor1');
        });

        it('should preserve both id and name attributes', () => {
            spectator.setInput('content', '<a name="S26" id="section26">Section</a><div id="content">Content</div>');
            spectator.detectChanges();

            const anchor = spectator.query('a[name="S26"]') as HTMLAnchorElement;
            expect(anchor).toBeTruthy();
            expect(anchor.getAttribute('name')).toBe('S26');
            expect(anchor.id).toBe('section26');

            const div = spectator.query('#content') as HTMLDivElement;
            expect(div).toBeTruthy();
            expect(div.id).toBe('content');
        });
    });

    describe('preprocessing', () => {
        it('should strip map elements from content', () => {
            spectator.setInput('content', '<p>Before</p><div class="map">Map content</div><p>After</p>');
            spectator.detectChanges();

            expect(spectator.query('.map')).toBeNull();
            expect(spectator.element.textContent).toContain('Before');
            expect(spectator.element.textContent).toContain('After');
        });

        it('should convert onclick to data-onclick', () => {
            spectator.setInput('content', '<div onclick="javascript:toggleAll()" id="clickable">Click</div>');
            spectator.detectChanges();

            const div = spectator.query('#clickable') as HTMLDivElement;
            expect(div.getAttribute('onclick')).toBeNull();
            expect(div.getAttribute('data-onclick')).toContain('javascript:toggleAll');
        });

        it('should rewrite fragment-only links to the current router path', () => {
            spectator.setInput('content', '<a href="#fn5">5</a>');
            spectator.detectChanges();

            const link = spectator.query('a') as HTMLAnchorElement;
            expect(link.getAttribute('href')).toBe('/articles/1#fn5');
        });

        it('should strip query and hash from the router url when rewriting', () => {
            (router as { url: string }).url = '/articles/1?tab=text#frag';
            routerEvents.next(new NavigationEnd(1, '/articles/1?tab=text', '/articles/1?tab=text'));
            spectator.setInput('content', '<a href="#fn5">5</a>');
            spectator.detectChanges();

            expect((spectator.query('a') as HTMLAnchorElement).getAttribute('href')).toBe('/articles/1#fn5');
        });

        it('should re-sync rewritten hrefs when the route changes without content change', () => {
            spectator.setInput('content', '<a href="#fn5">5</a>');
            spectator.detectChanges();
            expect((spectator.query('a') as HTMLAnchorElement).getAttribute('href')).toBe('/articles/1#fn5');

            (router as { url: string }).url = '/articles/2';
            routerEvents.next(new NavigationEnd(1, '/articles/2', '/articles/2'));
            spectator.detectChanges();

            expect((spectator.query('a') as HTMLAnchorElement).getAttribute('href')).toBe('/articles/2#fn5');
        });
    });

    describe('click handler chain (integration)', () => {
        it('should navigate for internal links via handler chain', () => {
            spectator.setInput('content', '<a href="/articles/123">Article</a>');
            spectator.detectChanges();

            const link = spectator.query('a') as HTMLAnchorElement;
            link.click();

            expect(router.navigateByUrl).toHaveBeenCalledWith('/articles/123');
        });

        it('should open lightbox for picture clicks via handler chain', () => {
            spectator.setInput(
                'content',
                '<table class="pic"><tr><td><a href="/pictures/123"><img src="/test.jpg" /></a></td></tr></table>',
            );
            spectator.detectChanges();

            const img = spectator.query('.pic img') as HTMLImageElement;
            img.click();

            expect(lightboxService.open).toHaveBeenCalledWith(123);
            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });

        it('should not intercept modified clicks so the browser opens a new tab', () => {
            spectator.setInput('content', '<a href="/articles/123">Article</a>');
            spectator.detectChanges();

            const link = spectator.query('a') as HTMLAnchorElement;
            const event = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
            const preventSpy = jest.spyOn(event, 'preventDefault');
            link.dispatchEvent(event);

            expect(router.navigateByUrl).not.toHaveBeenCalled();
            expect(preventSpy).not.toHaveBeenCalled();
        });

        it('should not intercept external links', () => {
            spectator.setInput('content', '<a href="https://example.com">External</a>');
            spectator.detectChanges();

            const link = spectator.query('a') as HTMLAnchorElement;
            link.click();

            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });

        it('should not intercept clicks on non-link elements', () => {
            spectator.setInput('content', '<p>Plain text</p>');
            spectator.detectChanges();

            const paragraph = spectator.query('p') as HTMLParagraphElement;
            paragraph.click();

            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });
    });

    describe('cleanup', () => {
        it('should remove event listener on destroy', () => {
            const removeEventListenerSpy = jest.spyOn(spectator.element, 'removeEventListener');

            spectator.component.ngOnDestroy();

            expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
        });
    });
});
