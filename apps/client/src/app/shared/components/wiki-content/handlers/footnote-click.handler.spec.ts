import { FootnoteClickHandler } from './footnote-click.handler';
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { mockLoggerProvider } from '@drevo-web/core/testing';
import { ModalService } from '@drevo-web/ui';

describe('FootnoteClickHandler', () => {
    let spectator: SpectatorService<FootnoteClickHandler>;
    let modalService: jest.Mocked<ModalService>;
    let host: HTMLElement;

    const createService = createServiceFactory({
        service: FootnoteClickHandler,
        providers: [mockLoggerProvider()],
        mocks: [ModalService],
    });

    beforeEach(() => {
        window.history.replaceState({}, '', '/articles/1');
        spectator = createService();
        modalService = spectator.inject(ModalService) as jest.Mocked<ModalService>;
        host = document.createElement('div');
    });

    const addFootnote = (id: string, innerHTML: string): HTMLElement => {
        const footnote = document.createElement('div');
        footnote.className = 'footnote';
        footnote.id = id;
        footnote.innerHTML = innerHTML;
        document.body.appendChild(footnote);
        return footnote;
    };

    afterEach(() => {
        document.querySelectorAll('.footnote').forEach(el => el.remove());
        window.history.replaceState({}, '', '/');
    });

    it('should return false for non-anchor clicks', () => {
        host.innerHTML = '<p>Text</p>';
        const p = host.querySelector('p') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        expect(spectator.service.handleClick(event, p, host)).toBe(false);
        expect(modalService.open).not.toHaveBeenCalled();
    });

    it('should ignore anchors without the footnote marker class', () => {
        host.innerHTML = '<a href="/articles/1#fn1">[1]</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        expect(spectator.service.handleClick(event, anchor, host)).toBe(false);
        expect(modalService.open).not.toHaveBeenCalled();
    });

    it('should not intercept when the footnote definition is missing', () => {
        host.innerHTML = '<a class="link-note" href="/articles/1#fn1">[1]</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        const preventSpy = jest.spyOn(event, 'preventDefault');

        expect(spectator.service.handleClick(event, anchor, host)).toBe(false);
        expect(preventSpy).not.toHaveBeenCalled();
        expect(modalService.open).not.toHaveBeenCalled();
    });

    it('should not intercept a marker pointing to another article even if the id exists locally', () => {
        addFootnote('fn1', '<p>Footnote text</p>');
        host.innerHTML = '<a class="link-note" href="/articles/2#fn1">[1]</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        const preventSpy = jest.spyOn(event, 'preventDefault');

        expect(spectator.service.handleClick(event, anchor, host)).toBe(false);
        expect(preventSpy).not.toHaveBeenCalled();
        expect(modalService.open).not.toHaveBeenCalled();
    });

    it('should open a bottom-sheet modal with the footnote content on marker click', () => {
        addFootnote('fn1', '<p><a class="link-source" href="/articles/1#fnref1">[1]</a> Footnote text</p>');
        host.innerHTML = '<a class="link-note" id="fnref1" href="/articles/1#fn1">[1]</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        const preventSpy = jest.spyOn(event, 'preventDefault');

        const result = spectator.service.handleClick(event, anchor, host);

        expect(result).toBe(true);
        expect(preventSpy).toHaveBeenCalled();
        expect(modalService.open).toHaveBeenCalledWith(
            expect.any(Function),
            expect.objectContaining({
                position: 'bottom',
                data: expect.objectContaining({ label: '[1]' }),
            }),
        );
    });

    it('should not open the modal on ctrl/cmd-click so the browser can open a new tab', () => {
        addFootnote('fn1', '<p>Footnote text</p>');
        host.innerHTML = '<a class="link-note" id="fnref1" href="/articles/1#fn1">[1]</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
        const preventSpy = jest.spyOn(event, 'preventDefault');

        expect(spectator.service.handleClick(event, anchor, host)).toBe(false);
        expect(preventSpy).not.toHaveBeenCalled();
        expect(modalService.open).not.toHaveBeenCalled();
    });

    it('should strip the back-reference link from the footnote content', () => {
        addFootnote('fn1', '<p><a class="link-source" href="/articles/1#fnref1">[1]</a> Footnote text</p>');
        host.innerHTML = '<a class="link-note" id="fnref1" href="/articles/1#fn1">[1]</a>';
        const anchor = host.querySelector('a') as HTMLElement;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });

        spectator.service.handleClick(event, anchor, host);

        const config = modalService.open.mock.calls[0][1];
        const html = (config?.data as { html: string }).html;
        expect(html).toContain('Footnote text');
        expect(html).not.toContain('link-source');
    });
});
