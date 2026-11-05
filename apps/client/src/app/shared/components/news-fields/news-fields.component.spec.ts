import { NewsFieldsComponent } from './news-fields.component';
import { NewsFields } from '../../models/news-fields.model';
import { NewsTopic } from '@drevo-web/shared';
import { ButtonToggleGroupComponent } from '@drevo-web/ui/button-toggle-group';
import { TextInputComponent } from '@drevo-web/ui/text-input';
import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

describe('NewsFieldsComponent', () => {
    let spectator: Spectator<NewsFieldsComponent>;
    let changes: NewsFields[];

    const topics: readonly NewsTopic[] = [
        { id: 3, title: 'Церковь' },
        { id: 5, title: 'Общество' },
    ];
    const value: NewsFields = { title: 'Новость', newsDate: '2026-11-05', topic: undefined };

    const createComponent = createComponentFactory({ component: NewsFieldsComponent });

    beforeEach(async () => {
        spectator = createComponent({ props: { topics, value } });
        changes = [];
        spectator.output('valueChange').subscribe(change => changes.push(change));
        await spectator.fixture.whenStable();
    });

    const textInputs = (): TextInputComponent[] => spectator.queryAll(TextInputComponent);

    it('asks for the title and the day, showing the values it is given', () => {
        expect(textInputs().map(input => input.label())).toEqual(['Заголовок', 'Дата']);
        expect(textInputs()[1].type()).toBe('date');
    });

    it('offers each section to pick', () => {
        expect(spectator.query(ButtonToggleGroupComponent)?.options()).toEqual([
            { value: 3, label: 'Церковь' },
            { value: 5, label: 'Общество' },
        ]);
    });

    it('reports a new title with the other fields kept', () => {
        spectator.component.onTitle('Другая');

        expect(changes).toEqual([{ ...value, title: 'Другая' }]);
    });

    it('reports a new day', () => {
        spectator.component.onDate('2026-11-06');

        expect(changes).toEqual([{ ...value, newsDate: '2026-11-06' }]);
    });

    it('reports the picked section', () => {
        spectator.component.onTopic(5);

        expect(changes).toEqual([{ ...value, topic: 5 }]);
    });
});
