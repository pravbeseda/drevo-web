import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { SectionsComponent } from './sections.component';

describe('SectionsComponent', () => {
    let spectator: Spectator<SectionsComponent>;
    const createComponent = createComponentFactory(SectionsComponent);

    it('renders the block heading', () => {
        spectator = createComponent();

        expect(spectator.query('[data-testid="sections-title"]')).toHaveText('Разделы');
    });
});
