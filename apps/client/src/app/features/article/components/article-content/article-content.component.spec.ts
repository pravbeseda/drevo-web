import { PictureLightboxService } from '../../../../services/pictures/picture-lightbox.service';
import { ArticlePageService } from '../../services/article-page.service';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { LoggerService } from '@drevo-web/core';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';
import { ArticleContentComponent } from './article-content.component';

describe('ArticleContentComponent', () => {
    let spectator: Spectator<ArticleContentComponent>;
    let router: jest.Mocked<Router>;
    let logger: MockLoggerService;
    let lightboxService: jest.Mocked<PictureLightboxService>;

    const createComponent = createComponentFactory({
        component: ArticleContentComponent,
        mocks: [Router],
        providers: [
            mockLoggerProvider(),
            mockProvider(PictureLightboxService),
            {
                provide: ArticlePageService,
                useValue: { editUrl: signal(undefined) },
            },
        ],
    });

    beforeEach(() => {
        spectator = createComponent();
        router = spectator.inject(Router) as jest.Mocked<Router>;
        logger = spectator.inject(LoggerService) as unknown as MockLoggerService;
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

    describe('internal link navigation', () => {
        it('should navigate using router for internal links', () => {
            spectator.setInput('content', '<a href="/articles/123">Article Link</a>');
            spectator.detectChanges();

            const link = spectator.query('a') as HTMLAnchorElement;
            link.click();

            expect(router.navigateByUrl).toHaveBeenCalledWith('/articles/123');
        });

        it('should prevent default browser navigation for internal links', () => {
            spectator.setInput('content', '<a href="/articles/456">Article Link</a>');
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
            spectator.setInput('content', '<a href="/articles/789"><span>Nested Text</span></a>');
            spectator.detectChanges();

            const span = spectator.query('span') as HTMLSpanElement;
            span.click();

            expect(router.navigateByUrl).toHaveBeenCalledWith('/articles/789');
        });
    });

    describe('external link handling', () => {
        it('should not intercept external http links', () => {
            spectator.setInput('content', '<a href="https://example.com">External</a>');
            spectator.detectChanges();

            const link = spectator.query('a') as HTMLAnchorElement;
            link.click();

            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });

        it('should not intercept mailto links', () => {
            spectator.setInput('content', '<a href="mailto:test@example.com">Email</a>');
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

    describe('anchor navigation', () => {
        it('should handle anchor links with hash', () => {
            const mockElement = document.createElement('div');
            mockElement.setAttribute('name', 'section1');
            mockElement.scrollIntoView = jest.fn();
            spectator.element.appendChild(mockElement);

            const scrollIntoViewSpy = jest.spyOn(mockElement, 'scrollIntoView');
            const pushStateSpy = jest.spyOn(history, 'pushState');

            spectator.setInput('content', '<a href="#section1">Go to section</a>');
            spectator.detectChanges();

            const link = spectator.query('a') as HTMLAnchorElement;
            link.click();

            expect(scrollIntoViewSpy).toHaveBeenCalledWith({
                behavior: 'smooth',
                block: 'start',
            });
            expect(pushStateSpy).toHaveBeenCalledWith(undefined, '', expect.stringContaining('#section1'));
        });

        it('should handle anchor IDs with special characters safely', () => {
            // Test that CSS.escape() prevents selector injection
            const safeId = 'section-with-special';
            const mockElement = document.createElement('div');
            mockElement.setAttribute('name', safeId);
            mockElement.scrollIntoView = jest.fn();
            spectator.element.appendChild(mockElement);

            const scrollIntoViewSpy = jest.spyOn(mockElement, 'scrollIntoView');

            spectator.setInput('content', `<a href="#${safeId}">Go to section</a>`);
            spectator.detectChanges();

            const link = spectator.query('a') as HTMLAnchorElement;
            link.click();

            expect(scrollIntoViewSpy).toHaveBeenCalled();
        });

        it('should not throw error when anchor target does not exist', () => {
            const pushStateSpy = jest.spyOn(history, 'pushState');

            spectator.setInput('content', '<a href="#nonexistent">Go nowhere</a>');
            spectator.detectChanges();

            const link = spectator.query('a') as HTMLAnchorElement;

            expect(() => link.click()).not.toThrow();
            expect(pushStateSpy).not.toHaveBeenCalled();
        });
    });

    describe('picture lightbox', () => {
        it('should open lightbox when clicking image inside .pic with .html suffix', () => {
            spectator.setInput(
                'content',
                '<table class="pic"><tr><td class="picimage"><a href="/pictures/5319.html"><img class="noborder" src="/pictures/thumbs/002/005319.jpg" alt="Test" /></a></td></tr></table>'
            );
            spectator.detectChanges();

            const img = spectator.query('.pic img') as HTMLImageElement;
            img.click();

            expect(lightboxService.open).toHaveBeenCalledWith(5319);
            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });

        it('should open lightbox when clicking image inside .pic without .html suffix', () => {
            spectator.setInput(
                'content',
                '<table class="pic"><tr><td class="picimage"><a href="/pictures/123"><img src="/pictures/thumbs/004/000123.jpg" alt="Test" /></a></td></tr></table>'
            );
            spectator.detectChanges();

            const img = spectator.query('.pic img') as HTMLImageElement;
            img.click();

            expect(lightboxService.open).toHaveBeenCalledWith(123);
            expect(router.navigateByUrl).not.toHaveBeenCalled();
        });

        it('should open lightbox when clicking anywhere inside .pic', () => {
            spectator.setInput(
                'content',
                '<table class="pic"><tr><td class="picimage"><a href="/pictures/456"><img src="/pictures/thumbs/001/000456.jpg" /></a></td></tr><tr><td class="picdesc">Подпись</td></tr></table>'
            );
            spectator.detectChanges();

            const desc = spectator.query('.picdesc') as HTMLElement;
            desc.click();

            // picdesc is not inside an anchor, so no pictureId extracted
            expect(lightboxService.open).not.toHaveBeenCalled();
        });

        it('should prevent default for picture clicks', () => {
            spectator.setInput(
                'content',
                '<table class="pic"><tr><td><a href="/pictures/789"><img src="/test.jpg" /></a></td></tr></table>'
            );
            spectator.detectChanges();

            const img = spectator.query('.pic img') as HTMLImageElement;
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });
            const spy = jest.spyOn(event, 'preventDefault');

            img.dispatchEvent(event);

            expect(spy).toHaveBeenCalled();
            expect(lightboxService.open).toHaveBeenCalledWith(789);
        });

        it('should strip .html suffix from picture hrefs in rendered DOM', () => {
            spectator.setInput(
                'content',
                '<table class="pic"><tr><td class="picimage"><a href="/pictures/5319.html"><img src="/pictures/thumbs/002/005319.jpg" alt="Test" /></a></td></tr></table>'
            );
            spectator.detectChanges();

            const anchor = spectator.query('.pic a') as HTMLAnchorElement;
            expect(anchor.getAttribute('href')).toBe('/pictures/5319');
        });

        it('should leave non-picture .html links untouched', () => {
            spectator.setInput(
                'content',
                '<a href="/articles/42.html">Article</a><a href="https://example.com/x.html">External</a>'
            );
            spectator.detectChanges();

            const anchors = spectator.queryAll('a') as HTMLAnchorElement[];
            expect(anchors[0].getAttribute('href')).toBe('/articles/42.html');
            expect(anchors[1].getAttribute('href')).toBe('https://example.com/x.html');
        });
    });

    describe('cleanup', () => {
        it('should remove event listener on destroy', () => {
            const removeEventListenerSpy = jest.spyOn(spectator.element, 'removeEventListener');

            spectator.component.ngOnDestroy();

            expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
        });
    });

    describe('legacy interactive features', () => {
        describe('toggleAll', () => {
            it('should toggle comment visibility and link text', () => {
                spectator.setInput(
                    'content',
                    `
                    <p><a href="javascript:toggleAll()" class="LinkComment">Свернуть</a></p>
                    <div class="cmnt">Comment 1</div>
                    <div class="cmnt">Comment 2</div>
                `
                );
                spectator.detectChanges();

                const link = spectator.query('.LinkComment') as HTMLElement;
                const comments = spectator.queryAll<HTMLElement>('.cmnt');

                // Initial state
                expect(link.textContent?.trim()).toBe('Свернуть');
                expect(comments[0].style.display).toBe('');

                // Click to collapse
                link.click();

                expect(link.textContent?.trim()).toBe('Развернуть');
                expect(comments[0].style.display).toBe('none');
                expect(comments[1].style.display).toBe('none');

                // Click to expand
                link.click();

                expect(link.textContent?.trim()).toBe('Свернуть');
                expect(comments[0].style.display).toBe('');
                expect(comments[1].style.display).toBe('');
            });

            it('should handle multiple toggle links', () => {
                spectator.setInput(
                    'content',
                    `
                    <p><a href="javascript:toggleAll()" class="LinkComment">Свернуть</a></p>
                    <div class="cmnt">Comment</div>
                    <p><a href="javascript:toggleAll()" class="LinkComment">Свернуть</a></p>
                `
                );
                spectator.detectChanges();

                const links = spectator.queryAll<HTMLElement>('.LinkComment');

                links[0].click();

                expect(links[0].textContent?.trim()).toBe('Развернуть');
                expect(links[1].textContent?.trim()).toBe('Развернуть');
            });
        });

        describe('toggleRus', () => {
            it('should toggle Russian translation visibility', () => {
                spectator.setInput(
                    'content',
                    `
                    <p><a href="javascript:toggleRus()" class="toggleRus">Скрыть русский перевод</a></p>
                    <div class="BibleRus">Russian text</div>
                    <div class="BibleCsl">Church Slavonic text</div>
                `
                );
                spectator.detectChanges();

                const link = spectator.query('.toggleRus') as HTMLElement;
                const rusElement = spectator.query<HTMLElement>('.BibleRus')!;
                const cslElement = spectator.query<HTMLElement>('.BibleCsl')!;

                // Click to hide Russian
                link.click();

                expect(rusElement.style.display).toBe('none');
                expect(cslElement.style.display).toBe('');
                expect(link.textContent?.trim()).toBe('Показать русский перевод');

                // Click to show Russian
                link.click();

                expect(rusElement.style.display).toBe('');
                expect(link.textContent?.trim()).toBe('Скрыть русский перевод');
            });

            it('should ensure Church Slavonic is visible when hiding Russian', () => {
                spectator.setInput(
                    'content',
                    `
                    <p><a href="javascript:toggleRus()" class="toggleRus">Скрыть русский перевод</a></p>
                    <div class="BibleRus">Russian</div>
                    <div class="BibleCsl" style="display: none;">Church Slavonic</div>
                `
                );
                spectator.detectChanges();

                const link = spectator.query('.toggleRus') as HTMLElement;
                const cslElement = spectator.query<HTMLElement>('.BibleCsl')!;

                link.click();

                expect(cslElement.style.display).toBe('');
            });
        });

        describe('toggleCsl', () => {
            it('should toggle Church Slavonic translation visibility', () => {
                spectator.setInput(
                    'content',
                    `
                    <p><a href="javascript:toggleCsl()" class="toggleCsl">Скрыть церковнославянский перевод</a></p>
                    <div class="BibleRus">Russian text</div>
                    <div class="BibleCsl">Church Slavonic text</div>
                `
                );
                spectator.detectChanges();

                const link = spectator.query('.toggleCsl') as HTMLElement;
                const rusElement = spectator.query<HTMLElement>('.BibleRus')!;
                const cslElement = spectator.query<HTMLElement>('.BibleCsl')!;

                // Click to hide Church Slavonic
                link.click();

                expect(cslElement.style.display).toBe('none');
                expect(rusElement.style.display).toBe('');
                expect(link.textContent?.trim()).toBe('Показать церковнославянский перевод');

                // Click to show Church Slavonic
                link.click();

                expect(cslElement.style.display).toBe('');
                expect(link.textContent?.trim()).toBe('Скрыть церковнославянский перевод');
            });

            it('should ensure Russian is visible when hiding Church Slavonic', () => {
                spectator.setInput(
                    'content',
                    `
                    <p><a href="javascript:toggleCsl()" class="toggleCsl">Скрыть церковнославянский перевод</a></p>
                    <div class="BibleRus" style="display: none;">Russian</div>
                    <div class="BibleCsl">Church Slavonic</div>
                `
                );
                spectator.detectChanges();

                const link = spectator.query('.toggleCsl') as HTMLElement;
                const rusElement = spectator.query<HTMLElement>('.BibleRus')!;

                link.click();

                expect(rusElement.style.display).toBe('');
            });
        });

        describe('javascript: link handling', () => {
            it('should prevent default for javascript: links', () => {
                spectator.setInput('content', '<a href="javascript:toggleAll()">Toggle</a>');
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

            it('should not call router.navigateByUrl for javascript: links', () => {
                spectator.setInput('content', '<a href="javascript:toggleAll()">Toggle</a>');
                spectator.detectChanges();

                const link = spectator.query('a') as HTMLAnchorElement;
                link.click();

                expect(router.navigateByUrl).not.toHaveBeenCalled();
            });

            it('should handle javascript: links with uppercase (JavaScript:)', () => {
                spectator.setInput('content', '<a href="JavaScript:toggleAll()">Toggle</a>');
                spectator.detectChanges();

                const link = spectator.query('a') as HTMLAnchorElement;
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                });
                const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

                link.dispatchEvent(event);

                expect(preventDefaultSpy).toHaveBeenCalled();
                expect(router.navigateByUrl).not.toHaveBeenCalled();
            });

            it('should handle javascript: links with mixed case', () => {
                spectator.setInput('content', '<a href="JaVaScRiPt:toggleRus()">Toggle</a>');
                spectator.detectChanges();

                const link = spectator.query('a') as HTMLAnchorElement;
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                });
                const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

                link.dispatchEvent(event);

                expect(preventDefaultSpy).toHaveBeenCalled();
                expect(router.navigateByUrl).not.toHaveBeenCalled();
            });

            it('should handle javascript: links with whitespace', () => {
                spectator.setInput('content', '<a href="  javascript:toggleCsl()  ">Toggle</a>');
                spectator.detectChanges();

                const link = spectator.query('a') as HTMLAnchorElement;
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                });
                const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

                link.dispatchEvent(event);

                expect(preventDefaultSpy).toHaveBeenCalled();
                expect(router.navigateByUrl).not.toHaveBeenCalled();
            });

            it('should reject invalid javascript: patterns with special characters', () => {
                spectator.setInput('content', '<a href="javascript:alert(\'xss\')">Invalid</a>');
                spectator.detectChanges();

                const link = spectator.query('a') as HTMLAnchorElement;
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                });
                const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

                link.dispatchEvent(event);

                expect(preventDefaultSpy).toHaveBeenCalled();
                // Should log warning but not execute any action
                expect(logger.mockLogger.warn).toHaveBeenCalledWith(
                    'Unknown javascript action',
                    expect.objectContaining({
                        action: 'alert',
                        value: expect.any(String),
                    })
                );
            });

            it('should reject unknown javascript: actions', () => {
                spectator.setInput('content', '<a href="javascript:unknownAction()">Unknown</a>');
                spectator.detectChanges();

                const link = spectator.query('a') as HTMLAnchorElement;
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                });

                link.dispatchEvent(event);

                expect(logger.mockLogger.warn).toHaveBeenCalledWith(
                    'Unknown javascript action',
                    expect.objectContaining({
                        action: 'unknownAction',
                        value: expect.any(String),
                    })
                );
            });

            it('should reject data: protocol links', () => {
                spectator.setInput('content', '<a href="data:text/html,<script>alert(1)</script>">XSS</a>');
                spectator.detectChanges();

                const link = spectator.query('a') as HTMLAnchorElement;
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                });
                const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

                link.dispatchEvent(event);

                expect(preventDefaultSpy).toHaveBeenCalled();
                expect(router.navigateByUrl).not.toHaveBeenCalled();
            });

            it('should reject vbscript: protocol links', () => {
                spectator.setInput('content', '<a href="vbscript:msgbox(1)">XSS</a>');
                spectator.detectChanges();

                const link = spectator.query('a') as HTMLAnchorElement;
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                });
                const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

                link.dispatchEvent(event);

                expect(preventDefaultSpy).toHaveBeenCalled();
                expect(router.navigateByUrl).not.toHaveBeenCalled();
            });

            it('should warn on invalid javascript action format', () => {
                spectator.setInput('content', '<a href="javascript:console.log(\'test\')">Invalid</a>');
                spectator.detectChanges();

                const link = spectator.query('a') as HTMLAnchorElement;
                link.click();

                expect(logger.mockLogger.warn).toHaveBeenCalledWith(
                    'Invalid javascript action format',
                    expect.objectContaining({ value: expect.any(String) })
                );
            });
        });

        describe('toggleGroup', () => {
            it('should toggle elements with specified class name', () => {
                spectator.setInput(
                    'content',
                    `
                    <a href="javascript:toggleGroup('group1')">Toggle Group</a>
                    <div class="group1">Item 1</div>
                    <div class="group1">Item 2</div>
                `
                );
                spectator.detectChanges();

                const link = spectator.query('a') as HTMLAnchorElement;
                const items = spectator.queryAll<HTMLElement>('.group1');

                // Initial state - visible
                expect(items[0].style.display).toBe('');
                expect(items[1].style.display).toBe('');

                // Click to hide
                link.click();

                expect(items[0].style.display).toBe('none');
                expect(items[1].style.display).toBe('none');

                // Click to show
                link.click();

                expect(items[0].style.display).toBe('');
                expect(items[1].style.display).toBe('');
            });

            it('should warn when toggleGroup called without parameter', () => {
                spectator.setInput('content', '<a href="javascript:toggleGroup()">Invalid</a>');
                spectator.detectChanges();

                const link = spectator.query('a') as HTMLAnchorElement;
                link.click();

                expect(logger.mockLogger.warn).toHaveBeenCalledWith(
                    'toggleGroup requires a class name parameter',
                    expect.objectContaining({ value: expect.any(String) })
                );
            });
        });

        describe('onclick attribute handling', () => {
            it('should convert onclick to data-onclick and handle clicks', () => {
                spectator.setInput(
                    'content',
                    `<table onclick="javascript:toggleGroup('cmnt3')"><tr><td>Click me</td></tr></table>
                    <div class="cmnt3">Content</div>`
                );
                spectator.detectChanges();

                const table = spectator.query('table') as HTMLTableElement;
                const td = spectator.query('td') as HTMLTableCellElement;
                const content = spectator.query<HTMLElement>('.cmnt3')!;

                // onclick should be converted to data-onclick
                expect(table.getAttribute('onclick')).toBeNull();
                expect(table.getAttribute('data-onclick')).toContain('javascript:toggleGroup');

                // Initial state
                expect(content.style.display).toBe('');

                // Click on child element (td)
                td.click();

                // Should toggle visibility
                expect(content.style.display).toBe('none');
            });

            it('should handle onclick with single quotes', () => {
                spectator.setInput(
                    'content',
                    `<div onclick='javascript:toggleAll()' id="clickable">Click</div>
                    <div class="cmnt">Comment</div>`
                );
                spectator.detectChanges();

                const div = spectator.query('#clickable') as HTMLDivElement;

                expect(div.getAttribute('onclick')).toBeNull();
                expect(div.getAttribute('data-onclick')).toContain('javascript:toggleAll');
            });

            it('should handle onclick on nested elements', () => {
                spectator.setInput(
                    'content',
                    `<table onclick="javascript:toggleGroup('test')">
                        <tr><td><span>Deep nested</span></td></tr>
                    </table>
                    <div class="test">Content</div>`
                );
                spectator.detectChanges();

                const span = spectator.query('span') as HTMLSpanElement;
                const content = spectator.query<HTMLElement>('.test')!;

                span.click();

                expect(content.style.display).toBe('none');
            });
        });
    });
});
