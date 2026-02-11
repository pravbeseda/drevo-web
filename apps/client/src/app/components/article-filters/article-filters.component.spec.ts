import { ArticleFiltersComponent } from './article-filters.component';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { HistoryFilter } from '../../services/articles/article-history/article-history.service';

describe('ArticleFiltersComponent', () => {
    let spectator: Spectator<ArticleFiltersComponent>;

    const createComponent = createComponentFactory({
        component: ArticleFiltersComponent,
    });

    beforeEach(() => {
        spectator = createComponent({
            props: { activeFilter: 'all' as HistoryFilter },
        });
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should render all base filter buttons', () => {
        const buttons = spectator.queryAll('.filter-item');
        const labels = buttons.map(b => b.textContent?.trim());

        expect(labels).toContain('Все');
        expect(labels).toContain('Непроверенные');
        expect(labels).toContain('Неоконченные');
        expect(labels).toContain('Неразмеченные');
        expect(labels).toContain('Вне словников');
        expect(labels).toContain('Требующиеся');
    });

    it('should render section header', () => {
        const header = spectator.query('.filter-section-header');
        expect(header?.textContent?.trim()).toBe('В работе');
    });

    it('should hide "Мои" when canFilterByAuthor is false', () => {
        spectator.setInput('canFilterByAuthor', false);

        const buttons = spectator.queryAll('.filter-item');
        const labels = buttons.map(b => b.textContent?.trim());
        expect(labels).not.toContain('Мои');
    });

    it('should show "Мои" when canFilterByAuthor is true', () => {
        spectator.setInput('canFilterByAuthor', true);

        const buttons = spectator.queryAll('.filter-item');
        const labels = buttons.map(b => b.textContent?.trim());
        expect(labels).toContain('Мои');
    });

    it('should mark active filter with active class', () => {
        spectator.setInput('activeFilter', 'unchecked' as HistoryFilter);

        const activeButtons = spectator.queryAll('.filter-item.active');
        expect(activeButtons.length).toBe(1);
        expect(activeButtons[0].textContent?.trim()).toBe('Непроверенные');
    });

    it('should set aria-checked on active filter', () => {
        spectator.setInput('activeFilter', 'all' as HistoryFilter);

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

    it('should emit filterChange with nested filter value', () => {
        const filterChangeSpy = jest.fn();
        spectator.component.filterChange.subscribe(filterChangeSpy);

        const nestedButton = spectator
            .queryAll('.filter-item.nested')
            .find(b => b.textContent?.trim() === 'Неоконченные');
        spectator.click(nestedButton!);

        expect(filterChangeSpy).toHaveBeenCalledWith('unfinished');
    });

    it('should apply nested class to "В работе" sub-items', () => {
        const nestedButtons = spectator.queryAll('.filter-item.nested');
        const labels = nestedButtons.map(b => b.textContent?.trim());

        expect(labels).toEqual([
            'Неоконченные',
            'Неразмеченные',
            'Вне словников',
            'Требующиеся',
        ]);
    });

    it('should have radiogroup role on list', () => {
        const list = spectator.query('ul');
        expect(list?.getAttribute('role')).toBe('radiogroup');
    });
});
