import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { Picture } from '@drevo-web/shared';
import { PictureRow } from '../../services/picture-row-builder';
import { PictureRowComponent } from './picture-row.component';

describe('PictureRowComponent', () => {
    let spectator: Spectator<PictureRowComponent>;

    const makePicture = (id: number): Picture => ({
        id,
        folder: '001',
        title: `Picture ${id}`,
        user: 'user',
        date: new Date(),
        width: 800,
        height: 600,
        imageUrl: `/images/001/${String(id).padStart(6, '0')}.jpg`,
        thumbnailUrl: `/pictures/thumbs/001/${String(id).padStart(6, '0')}.jpg`,
    });

    const mockRow: PictureRow = {
        height: 200,
        items: [
            { picture: makePicture(1), width: 266, height: 200 },
            { picture: makePicture(2), width: 266, height: 200 },
            { picture: makePicture(3), width: 266, height: 200 },
        ],
    };

    const createComponent = createComponentFactory({
        component: PictureRowComponent,
    });

    beforeEach(() => {
        spectator = createComponent({
            props: { row: mockRow },
        });
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should render correct number of picture cards', () => {
        const cards = spectator.queryAll('app-picture-card');
        expect(cards).toHaveLength(3);
    });

    it('should apply row height', () => {
        const row = spectator.query('.picture-row');
        expect((row as HTMLElement).style.height).toBe('200px');
    });

    it('should emit pictureClick when a card is clicked', () => {
        const spy = jest.spyOn(spectator.component.pictureClick, 'emit');
        const card = spectator.query('[data-testid="picture-card"]');
        spectator.click(card as Element);
        expect(spy).toHaveBeenCalledWith(mockRow.items[0].picture);
    });
});
