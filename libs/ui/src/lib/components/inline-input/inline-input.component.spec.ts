import { createHostFactory, SpectatorHost } from '@ngneat/spectator/jest';
import { InlineInputComponent } from './inline-input.component';

describe('InlineInputComponent', () => {
    let spectator: SpectatorHost<InlineInputComponent>;

    const createHost = createHostFactory(InlineInputComponent);

    beforeEach(() => {
        spectator = createHost(`<ui-inline-input [value]="value" placeholder="Заголовок" />`, {
            hostProps: { value: 'Начало' },
        });
    });

    it('shows the bound value', () => {
        expect(spectator.query<HTMLInputElement>('input')?.value).toBe('Начало');
    });

    it('follows a new bound value', () => {
        spectator.setHostInput({ value: '' });

        expect(spectator.query<HTMLInputElement>('input')?.value).toBe('');
    });

    it('shows the placeholder', () => {
        expect(spectator.query('input')).toHaveAttribute('placeholder', 'Заголовок');
    });

    it('names the field by its placeholder when no aria label is given', () => {
        expect(spectator.query('input')).toHaveAttribute('aria-label', 'Заголовок');
    });

    it('emits what the reader types', () => {
        const values: string[] = [];
        spectator.output<string>('valueChanged').subscribe(value => values.push(value));

        spectator.typeInElement('Новая тема', 'input');

        expect(values).toEqual(['Новая тема']);
    });
});
