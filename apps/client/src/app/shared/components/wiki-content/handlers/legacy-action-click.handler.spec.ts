import { BibleToggleAction } from '../actions/bible-toggle.action';
import { CommentToggleAction } from '../actions/comment-toggle.action';
import { GroupToggleAction } from '../actions/group-toggle.action';
import { MapStubAction } from '../actions/map-stub.action';
import { LegacyActionClickHandler } from './legacy-action-click.handler';
import { TestBed } from '@angular/core/testing';
import { LoggerService, NotificationService } from '@drevo-web/core';
import { mockLoggerProvider, MockLoggerService } from '@drevo-web/core/testing';

describe('LegacyActionClickHandler', () => {
    let handler: LegacyActionClickHandler;
    let logger: MockLoggerService;
    let host: HTMLElement;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                LegacyActionClickHandler,
                BibleToggleAction,
                CommentToggleAction,
                GroupToggleAction,
                MapStubAction,
                mockLoggerProvider(),
                { provide: NotificationService, useValue: { info: jest.fn() } },
            ],
        });
        handler = TestBed.inject(LegacyActionClickHandler);
        logger = TestBed.inject(LoggerService) as unknown as MockLoggerService;
        host = document.createElement('div');
    });

    describe('javascript: href links', () => {
        it('should prevent default for javascript: links', () => {
            host.innerHTML = '<a href="javascript:toggleAll()">Toggle</a>';
            const anchor = host.querySelector('a') as HTMLElement;
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });
            const spy = jest.spyOn(event, 'preventDefault');

            handler.handleClick(event, anchor, host);

            expect(spy).toHaveBeenCalled();
        });

        it('should return true for javascript: links', () => {
            host.innerHTML = '<a href="javascript:toggleAll()">Toggle</a>';
            const anchor = host.querySelector('a') as HTMLElement;
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });

            expect(handler.handleClick(event, anchor, host)).toBe(true);
        });

        it('should handle case-insensitive JavaScript: protocol', () => {
            host.innerHTML = '<a href="JavaScript:toggleAll()">Toggle</a>';
            const anchor = host.querySelector('a') as HTMLElement;
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });

            expect(handler.handleClick(event, anchor, host)).toBe(true);
        });

        it('should handle mixed case JaVaScRiPt: protocol', () => {
            host.innerHTML = '<a href="JaVaScRiPt:toggleRus()">Toggle</a>';
            const anchor = host.querySelector('a') as HTMLElement;
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });

            expect(handler.handleClick(event, anchor, host)).toBe(true);
        });

        it('should handle javascript: links with whitespace', () => {
            host.innerHTML = '<a href="  javascript:toggleCsl()  ">Toggle</a>';
            const anchor = host.querySelector('a') as HTMLElement;
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });

            expect(handler.handleClick(event, anchor, host)).toBe(true);
        });

        it('should reject data: protocol links', () => {
            host.innerHTML = '<a href="data:text/html,<script>alert(1)</script>">XSS</a>';
            const anchor = host.querySelector('a') as HTMLElement;
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });
            const spy = jest.spyOn(event, 'preventDefault');

            const result = handler.handleClick(event, anchor, host);

            expect(result).toBe(true);
            expect(spy).toHaveBeenCalled();
        });

        it('should reject vbscript: protocol links', () => {
            host.innerHTML = '<a href="vbscript:msgbox(1)">XSS</a>';
            const anchor = host.querySelector('a') as HTMLElement;
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });
            const spy = jest.spyOn(event, 'preventDefault');

            const result = handler.handleClick(event, anchor, host);

            expect(result).toBe(true);
            expect(spy).toHaveBeenCalled();
        });

        it('should warn on invalid javascript action format', () => {
            host.innerHTML = '<a href="javascript:console.log(\'test\')">Invalid</a>';
            const anchor = host.querySelector('a') as HTMLElement;
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });

            handler.handleClick(event, anchor, host);

            expect(logger.mockLogger.warn).toHaveBeenCalledWith(
                'Invalid javascript action format',
                expect.objectContaining({ value: expect.any(String) }),
            );
        });

        it('should warn on unknown action', () => {
            host.innerHTML = '<a href="javascript:unknownAction()">Unknown</a>';
            const anchor = host.querySelector('a') as HTMLElement;
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });

            handler.handleClick(event, anchor, host);

            expect(logger.mockLogger.warn).toHaveBeenCalledWith(
                'Unknown javascript action',
                expect.objectContaining({ action: 'unknownAction', value: expect.any(String) }),
            );
        });

        it('should reject invalid patterns with special characters', () => {
            host.innerHTML = '<a href="javascript:alert(\'xss\')">XSS</a>';
            const anchor = host.querySelector('a') as HTMLElement;
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });

            handler.handleClick(event, anchor, host);

            expect(logger.mockLogger.warn).toHaveBeenCalledWith(
                'Unknown javascript action',
                expect.objectContaining({ action: 'alert', value: expect.any(String) }),
            );
        });
    });

    describe('data-onclick attribute handling', () => {
        it('should handle data-onclick on parent element', () => {
            host.innerHTML = `
                <table data-onclick="javascript:toggleGroup('cmnt3')"><tr><td>Click me</td></tr></table>
                <div class="cmnt3">Content</div>
            `;
            const td = host.querySelector('td') as HTMLElement;
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });

            const result = handler.handleClick(event, td, host);

            expect(result).toBe(true);
            expect((host.querySelector('.cmnt3') as HTMLElement).style.display).toBe('none');
        });

        it('should walk up DOM tree to find data-onclick', () => {
            host.innerHTML = `
                <table data-onclick="javascript:toggleGroup('test')">
                    <tr><td><span>Deep nested</span></td></tr>
                </table>
                <div class="test">Content</div>
            `;
            const span = host.querySelector('span') as HTMLElement;
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });

            const result = handler.handleClick(event, span, host);

            expect(result).toBe(true);
            expect((host.querySelector('.test') as HTMLElement).style.display).toBe('none');
        });

        it('should stop walking at host element', () => {
            host.setAttribute('data-onclick', "javascript:toggleGroup('outside')");
            host.innerHTML = '<p>Content</p>';
            const p = host.querySelector('p') as HTMLElement;
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });

            const result = handler.handleClick(event, p, host);

            expect(result).toBe(false);
        });
    });

    describe('action dispatching', () => {
        it('should dispatch toggleAll to CommentToggleAction', () => {
            host.innerHTML = `
                <a href="javascript:toggleAll()" class="LinkComment">Свернуть</a>
                <div class="cmnt">Comment</div>
            `;
            const anchor = host.querySelector('a') as HTMLElement;
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });

            handler.handleClick(event, anchor, host);

            expect((host.querySelector('.cmnt') as HTMLElement).style.display).toBe('none');
        });

        it('should dispatch toggleGroup with parameter', () => {
            host.innerHTML = `
                <a href="javascript:toggleGroup('group1')">Toggle</a>
                <div class="group1">Item</div>
            `;
            const anchor = host.querySelector('a') as HTMLElement;
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });

            handler.handleClick(event, anchor, host);

            expect((host.querySelector('.group1') as HTMLElement).style.display).toBe('none');
        });
    });

    describe('non-matching clicks', () => {
        it('should return false for regular links', () => {
            host.innerHTML = '<a href="/articles/123">Article</a>';
            const anchor = host.querySelector('a') as HTMLElement;
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });

            expect(handler.handleClick(event, anchor, host)).toBe(false);
        });

        it('should return false for non-link clicks', () => {
            host.innerHTML = '<p>Text</p>';
            const p = host.querySelector('p') as HTMLElement;
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });

            expect(handler.handleClick(event, p, host)).toBe(false);
        });
    });
});
