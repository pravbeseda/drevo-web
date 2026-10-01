import { ForumSendBarComponent } from './forum-send-bar.component';
import { WINDOW } from '@drevo-web/core';
import { ButtonComponent } from '@drevo-web/ui';
import { Spectator, createComponentFactory, createHostFactory } from '@ngneat/spectator/jest';

const MAC_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)';
const WINDOWS_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

describe('ForumSendBarComponent', () => {
    let spectator: Spectator<ForumSendBarComponent>;

    const createComponent = createComponentFactory(ForumSendBarComponent);
    const sendButton = (): HTMLButtonElement | null => spectator.query('[data-testid="forum-send"]');
    const attachButton = (): HTMLButtonElement | null => spectator.query('[data-testid="forum-attach"]');
    const hint = (): string | undefined => spectator.query('[data-testid="forum-send-hint"]')?.textContent?.trim();
    const createOn = (userAgent: string): Spectator<ForumSendBarComponent> =>
        createComponent({ providers: [{ provide: WINDOW, useValue: { navigator: { userAgent } } }] });

    describe('its controls', () => {
        let sent: jest.Mock;

        beforeEach(() => {
            spectator = createComponent();
            sent = jest.fn();
            spectator.output('send').subscribe(sent);
        });

        it('shows attaching, not yet available', () => {
            expect(attachButton()).toBeDisabled();
        });

        it('draws attaching as an icon that still names itself', () => {
            expect(attachButton()).toHaveAttribute('aria-label', 'Прикрепить');
            expect(attachButton()).not.toHaveText('Прикрепить');
        });

        it('sends on a click', () => {
            spectator.click(sendButton() as HTMLElement);

            expect(sent).toHaveBeenCalledTimes(1);
        });

        it('offers nothing to send while disabled', () => {
            spectator.setInput('disabled', true);

            expect(sendButton()).toBeDisabled();
        });

        it('shows the send in progress', () => {
            spectator.setInput('loading', true);

            expect(spectator.queryLast(ButtonComponent)?.loading()).toBe(true);
        });
    });

    describe('the keyboard hint', () => {
        it('names Ctrl+Enter', () => {
            spectator = createOn(WINDOWS_AGENT);

            expect(hint()).toBe('Ctrl+Enter — отправить');
        });

        it('names ⌘Enter on a Mac, spelled as the editor’s toolbar spells it', () => {
            spectator = createOn(MAC_AGENT);

            expect(hint()).toBe('⌘Enter — отправить');
        });
    });
});

describe('ForumSendBarComponent with tools of its host', () => {
    const createHost = createHostFactory(ForumSendBarComponent);

    it('puts them between attaching and sending', () => {
        const host = createHost(
            `<app-forum-send-bar><button data-testid="host-tool">Развернуть</button></app-forum-send-bar>`,
        );
        const order = Array.from(
            host.element.querySelectorAll(
                '[data-testid="forum-attach"], [data-testid="host-tool"], [data-testid="forum-send"]',
            ),
            element => element.getAttribute('data-testid'),
        );

        expect(order).toEqual(['forum-attach', 'host-tool', 'forum-send']);
    });
});
