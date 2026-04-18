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

    it('renders title, body and reload button', () => {
        expect(spectator.query('[data-testid="reload-prompt"]')).toExist();
        expect(spectator.query('#reload-prompt-title')?.textContent).toContain('Приложение обновилось');
        expect(spectator.query('[data-testid="reload-button"]')).toExist();
    });

    it('emits reload when the button is clicked', () => {
        const emitSpy = jest.fn();
        spectator.component.reload.subscribe(emitSpy);

        spectator.click('[data-testid="reload-button"]');

        expect(emitSpy).toHaveBeenCalledTimes(1);
    });
});
