import { FiltersSidePanelComponent } from './filters-side-panel.component';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';

describe('FiltersSidePanelComponent', () => {
    let spectator: Spectator<FiltersSidePanelComponent>;

    const createComponent = createComponentFactory({
        component: FiltersSidePanelComponent,
    });

    beforeEach(() => {
        spectator = createComponent({
            props: {
                filters: [
                    { key: 'all', label: 'Все' },
                    { key: 'unchecked', label: 'Непроверенные' },
                ],
                activeFilter: 'all',
            },
        });
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should toggle side panel on openFilters()', () => {
        expect(spectator.component.isSidePanelOpen()).toBe(false);

        spectator.component.openFilters();
        expect(spectator.component.isSidePanelOpen()).toBe(true);

        spectator.component.openFilters();
        expect(spectator.component.isSidePanelOpen()).toBe(false);
    });

    it('should emit filterChange', () => {
        const spy = jest.fn();
        spectator.output('filterChange').subscribe(spy);

        spectator.component.onFilterChange('unchecked');

        expect(spy).toHaveBeenCalledWith('unchecked');
    });

    it('should render sidebar action button', () => {
        expect(spectator.query('ui-sidebar-action')).toBeTruthy();
    });

    it('should render side panel', () => {
        expect(spectator.query('ui-side-panel')).toBeTruthy();
    });
});
