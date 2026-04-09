import { ConfirmationConfig } from './confirmation.types';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';
import { MODAL_DATA } from '../modal/models/modal.tokens';
import { ModalData } from '../modal/models/modal.types';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';

describe('ConfirmationDialogComponent', () => {
    let spectator: Spectator<ConfirmationDialogComponent>;
    let closeFn: jest.Mock;

    const defaultConfig: ConfirmationConfig = {
        title: 'Удалить черновик?',
        message: 'Вы уверены?',
        buttons: [
            { key: 'cancel', label: 'Отмена' },
            { key: 'confirm', label: 'Удалить', accent: 'primary' },
        ],
    };

    const createComponent = createComponentFactory({
        component: ConfirmationDialogComponent,
        providers: [],
    });

    function setup(config: ConfirmationConfig = defaultConfig): void {
        closeFn = jest.fn();
        const modalData: ModalData<ConfirmationConfig, string> = {
            data: config,
            close: closeFn,
        };

        spectator = createComponent({
            providers: [{ provide: MODAL_DATA, useValue: modalData }],
        });
    }

    it('should display title', () => {
        setup();

        expect(spectator.query('[data-testid="confirmation-dialog-title"]')).toHaveText('Удалить черновик?');
    });

    it('should display message', () => {
        setup();

        expect(spectator.query('.confirmation-dialog__message')).toHaveText('Вы уверены?');
    });

    it('should render all buttons', () => {
        setup();

        const buttons = spectator.queryAll('ui-button');

        expect(buttons).toHaveLength(2);
    });

    it('should call close with button key on click', () => {
        setup();

        const buttons = spectator.queryAll('ui-button button');
        spectator.click(buttons[0]);

        expect(closeFn).toHaveBeenCalledWith('cancel');
    });

    it('should call close with correct key for second button', () => {
        setup();

        const buttons = spectator.queryAll('ui-button button');
        spectator.click(buttons[1]);

        expect(closeFn).toHaveBeenCalledWith('confirm');
    });

    it('should have scrollable content area', () => {
        setup();

        const content = spectator.query('.confirmation-dialog__content');

        expect(content).toBeTruthy();
    });

    it('should render single button config', () => {
        setup({
            title: 'Info',
            message: 'Message',
            buttons: [{ key: 'ok', label: 'OK', accent: 'primary' }],
        });

        const buttons = spectator.queryAll('ui-button');

        expect(buttons).toHaveLength(1);
    });
});
