import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { SiteNumbersComponent } from './site-numbers.component';

describe('SiteNumbersComponent', () => {
    let spectator: Spectator<SiteNumbersComponent>;
    const createComponent = createComponentFactory(SiteNumbersComponent);

    it('renders the block heading', () => {
        spectator = createComponent();

        expect(spectator.query('[data-testid="site-numbers-title"]')).toHaveText('Древо в цифрах');
    });
});
