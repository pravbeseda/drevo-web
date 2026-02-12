import { FilterEntry } from './filter.model';
import { FiltersComponent } from './filters.component';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';

const FLAT_FILTERS: readonly FilterEntry[] = [
    { key: 'all', label: 'Все' },
    { key: 'unchecked', label: 'Непроверенные' },
    { key: 'my', label: 'Мои' },
];

const GROUPED_FILTERS: readonly FilterEntry[] = [
    { key: 'all', label: 'Все' },
    { key: 'unchecked', label: 'Непроверенные' },
    {
        label: 'В работе',
        items: [
            { key: 'unfinished', label: 'Неоконченные' },
            { key: 'unmarked', label: 'Неразмеченные' },
        ],
    },
    { key: 'my', label: 'Мои' },
];

describe('FiltersComponent', () => {
    let spectator: Spectator<FiltersComponent>;

    const createComponent = createComponentFactory({
        component: FiltersComponent,
    });

    describe('with flat filters', () => {
        beforeEach(() => {
            spectator = createComponent({
                props: { filters: FLAT_FILTERS, activeFilter: 'all' },
            });
        });

        it('should create', () => {
            expect(spectator.component).toBeTruthy();
        });

        it('should render all filter buttons', () => {
            const buttons = spectator.queryAll('.filter-item');
            const labels = buttons.map(b => b.textContent?.trim());

            expect(labels).toEqual(['Все', 'Непроверенные', 'Мои']);
        });

        it('should not render section headers', () => {
            expect(spectator.query('.filter-section-header')).toBeFalsy();
        });

        it('should mark active filter with active class', () => {
            spectator.setInput('activeFilter', 'unchecked');

            const activeButtons = spectator.queryAll('.filter-item.active');
            expect(activeButtons.length).toBe(1);
            expect(activeButtons[0].textContent?.trim()).toBe('Непроверенные');
        });

        it('should set aria-checked on active filter', () => {
            const allButton = spectator
                .queryAll('.filter-item')
                .find(b => b.textContent?.trim() === 'Все');
            expect(allButton?.getAttribute('aria-checked')).toBe('true');

            const uncheckedButton = spectator
                .queryAll('.filter-item')
                .find(b => b.textContent?.trim() === 'Непроверенные');
            expect(uncheckedButton?.getAttribute('aria-checked')).toBe('false');
        });

        it('should emit filterChange when filter clicked', () => {
            const filterChangeSpy = jest.fn();
            spectator.component.filterChange.subscribe(filterChangeSpy);

            const uncheckedButton = spectator
                .queryAll('.filter-item')
                .find(b => b.textContent?.trim() === 'Непроверенные');
            spectator.click(uncheckedButton!);

            expect(filterChangeSpy).toHaveBeenCalledWith('unchecked');
        });

        it('should have radiogroup role on list', () => {
            const list = spectator.query('ul');
            expect(list?.getAttribute('role')).toBe('radiogroup');
        });
    });

    describe('with grouped filters', () => {
        beforeEach(() => {
            spectator = createComponent({
                props: { filters: GROUPED_FILTERS, activeFilter: 'all' },
            });
        });

        it('should render section header', () => {
            const header = spectator.query('.filter-section-header');
            expect(header?.textContent?.trim()).toBe('В работе');
        });

        it('should apply nested class to group items', () => {
            const nestedButtons = spectator.queryAll('.filter-item.nested');
            const labels = nestedButtons.map(b => b.textContent?.trim());

            expect(labels).toEqual(['Неоконченные', 'Неразмеченные']);
        });

        it('should emit filterChange with nested filter key', () => {
            const filterChangeSpy = jest.fn();
            spectator.component.filterChange.subscribe(filterChangeSpy);

            const nestedButton = spectator
                .queryAll('.filter-item.nested')
                .find(b => b.textContent?.trim() === 'Неоконченные');
            spectator.click(nestedButton!);

            expect(filterChangeSpy).toHaveBeenCalledWith('unfinished');
        });

        it('should render all buttons including grouped', () => {
            const buttons = spectator.queryAll('.filter-item');
            expect(buttons.length).toBe(5);
        });

        it('should mark nested filter as active', () => {
            spectator.setInput('activeFilter', 'unmarked');

            const activeButtons = spectator.queryAll('.filter-item.active');
            expect(activeButtons.length).toBe(1);
            expect(activeButtons[0].textContent?.trim()).toBe('Неразмеченные');
        });
    });
});
