import { ReloadPromptComponent } from './reload-prompt.component';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

describe('ReloadPromptComponent', () => {
    let spectator: Spectator<ReloadPromptComponent>;
    const createComponent = createComponentFactory({
        component: ReloadPromptComponent,
    });

    beforeEach(() => {
        spectator = createComponent();
    });

    it('renders title, body, reload and dismiss buttons', () => {
        expect(spectator.query('[data-testid="reload-prompt"]')).toExist();
        expect(spectator.query('#reload-prompt-title')?.textContent).toContain('Приложение обновилось');
        expect(spectator.query('[data-testid="reload-button"]')).toExist();
        expect(spectator.query('[data-testid="dismiss-button"]')).toExist();
    });

    it('places reload button before dismiss in the DOM so the trap focuses it', () => {
        const buttons = spectator.queryAll<HTMLElement>('.actions [data-testid]');
        expect(buttons[0]?.getAttribute('data-testid')).toBe('reload-button');
        expect(buttons[1]?.getAttribute('data-testid')).toBe('dismiss-button');
    });

    it('emits reload when the reload button is clicked', () => {
        const emitSpy = jest.fn();
        spectator.component.reload.subscribe(emitSpy);

        spectator.click('[data-testid="reload-button"]');

        expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    it('emits dismiss when the dismiss button is clicked', () => {
        const emitSpy = jest.fn();
        spectator.component.dismiss.subscribe(emitSpy);

        spectator.click('[data-testid="dismiss-button"]');

        expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    it('emits dismiss when Esc is pressed', () => {
        const emitSpy = jest.fn();
        spectator.component.dismiss.subscribe(emitSpy);

        spectator.dispatchKeyboardEvent('[data-testid="reload-prompt"]', 'keydown', 'Escape');

        expect(emitSpy).toHaveBeenCalledTimes(1);
    });
});
