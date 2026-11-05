import { NewsFieldsComponent } from './news-fields.component';
import { NewsFields } from '../../models/news-fields.model';
import { TextInputComponent } from '@drevo-web/ui/text-input';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

describe('NewsFieldsComponent', () => {
    let spectator: Spectator<NewsFieldsComponent>;
    let changes: NewsFields[];

    const value: NewsFields = { title: 'Новость', newsDate: '2026-11-05', topic: undefined };

    const createComponent = createComponentFactory({ component: NewsFieldsComponent });

    beforeEach(async () => {
        spectator = createComponent({ props: { value } });
        changes = [];
        spectator.output('valueChange').subscribe(change => changes.push(change));
        await spectator.fixture.whenStable();
    });

    const textInputs = (): TextInputComponent[] => spectator.queryAll(TextInputComponent);

    it('asks for the title and the day, showing the values it is given', () => {
        expect(textInputs().map(input => input.label())).toEqual(['Заголовок', 'Дата']);
        expect(textInputs()[1].type()).toBe('date');
    });

    it('reports a new title with the other fields kept', () => {
        spectator.component.onTitle('Другая');

        expect(changes).toEqual([{ ...value, title: 'Другая' }]);
    });

    it('reports a new day', () => {
        spectator.component.onDate('2026-11-06');

        expect(changes).toEqual([{ ...value, newsDate: '2026-11-06' }]);
    });
});
