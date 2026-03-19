import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { Picture } from '@drevo-web/shared';
import { PictureCardComponent } from './picture-card.component';

describe('PictureCardComponent', () => {
    let spectator: Spectator<PictureCardComponent>;

    const mockPicture: Picture = {
        id: 123,
        folder: '004',
        title: 'Храм Христа Спасителя',
        user: 'Иван Иванов',
        date: new Date('2025-03-10T14:30:00Z'),
        width: 800,
        height: 600,
        imageUrl: '/images/004/000123.jpg',
        thumbnailUrl: '/pictures/thumbs/004/000123.jpg',
    };

    const createComponent = createComponentFactory({
        component: PictureCardComponent,
    });

    beforeEach(() => {
        spectator = createComponent({
            props: {
                picture: mockPicture,
                width: 266,
                height: 200,
            },
        });
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should render image with correct src and alt', () => {
        const img = spectator.query('img');
        expect(img).toBeTruthy();
        expect(img?.getAttribute('src')).toBe('/pictures/thumbs/004/000123.jpg');
        expect(img?.getAttribute('alt')).toBe('Храм Христа Спасителя');
    });

    it('should render image with lazy loading', () => {
        const img = spectator.query('img');
        expect(img?.getAttribute('loading')).toBe('lazy');
    });

    it('should display title in overlay', () => {
        const title = spectator.query('.picture-card__title');
        expect(title?.textContent?.trim()).toBe('Храм Христа Спасителя');
    });

    it('should display user in overlay', () => {
        const meta = spectator.query('.picture-card__meta');
        expect(meta?.textContent).toContain('Иван Иванов');
    });

    it('should apply width and height styles', () => {
        const card = spectator.query('[data-testid="picture-card"]');
        expect(card).toBeTruthy();
        expect((card as HTMLElement).style.width).toBe('266px');
        expect((card as HTMLElement).style.height).toBe('200px');
    });

    it('should emit pictureClick on click', () => {
        const spy = jest.spyOn(spectator.component.pictureClick, 'emit');
        spectator.click('[data-testid="picture-card"]');
        expect(spy).toHaveBeenCalledWith(mockPicture);
    });
});
