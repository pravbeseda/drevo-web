import {
    ReplaceFileDialogComponent,
    ReplaceFileDialogData,
    ReplaceFileDialogResult,
} from './replace-file-dialog.component';
import { MODAL_DATA, ModalData } from '@drevo-web/ui';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';

describe('ReplaceFileDialogComponent', () => {
    let spectator: Spectator<ReplaceFileDialogComponent>;
    let closeFn: jest.Mock;

    const defaultData: ReplaceFileDialogData = {
        currentTitle: 'Вид на Кремль',
        previewUrl: 'blob:http://localhost/preview-123',
    };

    const createComponent = createComponentFactory({
        component: ReplaceFileDialogComponent,
        providers: [],
    });

    function setup(data: ReplaceFileDialogData = defaultData): void {
        closeFn = jest.fn();
        const modalData: ModalData<ReplaceFileDialogData, ReplaceFileDialogResult> = {
            data,
            close: closeFn,
        };

        spectator = createComponent({
            providers: [{ provide: MODAL_DATA, useValue: modalData }],
        });
    }

    it('should display title', () => {
        setup();

        expect(spectator.query('[data-testid="replace-file-dialog-title"]')).toHaveText('Замена файла');
    });

    it('should display preview image with correct src', () => {
        setup();

        const img = spectator.query<HTMLImageElement>('[data-testid="replace-file-dialog-preview"]');
        expect(img?.src).toContain('blob:http://localhost/preview-123');
    });

    it('should pre-fill title with currentTitle', () => {
        setup();

        expect(spectator.component.titleControl.value).toBe('Вид на Кремль');
    });

    it('should disable confirm button when title is invalid', () => {
        setup();
        spectator.component.titleControl.setValue('Ab');
        spectator.detectChanges();

        const confirmBtn = spectator.query<HTMLButtonElement>('[data-testid="replace-file-dialog-confirm"] button');
        expect(confirmBtn?.disabled).toBe(true);
    });

    it('should enable confirm button when title is valid', () => {
        setup();
        spectator.detectChanges();

        const confirmBtn = spectator.query<HTMLButtonElement>('[data-testid="replace-file-dialog-confirm"] button');
        expect(confirmBtn?.disabled).toBe(false);
    });

    it('should show validation error for short title', () => {
        setup();
        spectator.component.titleControl.setValue('Ab');
        spectator.component.titleControl.markAsDirty();
        spectator.detectChanges();

        const error = spectator.query('[data-testid="replace-file-dialog-title-error"]');
        expect(error).toBeTruthy();
        expect(error?.textContent?.trim()).toBe('Минимум 5 символов');
    });

    it('should show validation error for too long title', () => {
        setup();
        spectator.component.titleControl.setValue('A'.repeat(501));
        spectator.component.titleControl.markAsDirty();
        spectator.detectChanges();

        const error = spectator.query('[data-testid="replace-file-dialog-title-error"]');
        expect(error).toBeTruthy();
        expect(error?.textContent?.trim()).toBe('Максимум 500 символов');
    });

    it('should not show validation error before user edits', () => {
        setup();

        expect(spectator.query('[data-testid="replace-file-dialog-title-error"]')).toBeNull();
    });

    it('should close with title on confirm', () => {
        setup();
        spectator.component.titleControl.setValue('Новое описание');
        spectator.detectChanges();

        spectator.click('[data-testid="replace-file-dialog-confirm"] button');

        expect(closeFn).toHaveBeenCalledWith({ title: 'Новое описание' });
    });

    it('should trim title on confirm', () => {
        setup();
        spectator.component.titleControl.setValue('  Новое описание  ');
        spectator.detectChanges();

        spectator.click('[data-testid="replace-file-dialog-confirm"] button');

        expect(closeFn).toHaveBeenCalledWith({ title: 'Новое описание' });
    });

    it('should not close on confirm when title is invalid', () => {
        setup();
        spectator.component.titleControl.setValue('Ab');
        spectator.detectChanges();

        spectator.component.confirm();

        expect(closeFn).not.toHaveBeenCalled();
    });

    it('should close without result on cancel', () => {
        setup();

        spectator.click('[data-testid="replace-file-dialog-cancel"] button');

        expect(closeFn).toHaveBeenCalledWith();
    });
});
