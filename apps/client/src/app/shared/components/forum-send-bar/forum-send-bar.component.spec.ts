import { ForumSendBarComponent } from './forum-send-bar.component';
import { ButtonComponent } from '@drevo-web/ui';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

describe('ForumSendBarComponent', () => {
    let spectator: Spectator<ForumSendBarComponent>;
    let sent: jest.Mock;

    const createComponent = createComponentFactory(ForumSendBarComponent);
    const sendButton = (): HTMLButtonElement | null => spectator.query('[data-testid="forum-send"]');

    beforeEach(() => {
        spectator = createComponent();
        sent = jest.fn();
        spectator.output('send').subscribe(sent);
    });

    it('shows attaching, not yet available', () => {
        expect(spectator.query('[data-testid="forum-attach"]')).toBeDisabled();
    });

    it('sends on a click', () => {
        spectator.click(sendButton() as HTMLElement);

        expect(sent).toHaveBeenCalledTimes(1);
    });

    it('offers nothing to send while disabled', () => {
        spectator.setInput('disabled', true);

        expect(sendButton()).toBeDisabled();
        spectator.click(sendButton() as HTMLElement);
        expect(sent).not.toHaveBeenCalled();
    });

    it('shows the send in progress', () => {
        spectator.setInput('loading', true);

        expect(spectator.queryLast(ButtonComponent)?.loading()).toBe(true);
    });
});
