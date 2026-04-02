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
                rowHeight: 200,
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

    it('should apply capped class when height is less than rowHeight', () => {
        spectator = createComponent({
            props: {
                picture: mockPicture,
                width: 250,
                height: 125,
                rowHeight: 200,
            },
        });

        const card = spectator.query('[data-testid="picture-card"]');
        expect(card).toHaveClass('picture-card--capped');
        expect((card as HTMLElement).style.height).toBe('200px');

        const img = spectator.query('img') as HTMLElement;
        expect(img.style.maxHeight).toBe('125px');
    });

    it('should not apply capped class when height equals rowHeight', () => {
        const card = spectator.query('[data-testid="picture-card"]');
        expect(card).not.toHaveClass('picture-card--capped');
    });

    it('should render as anchor with correct href', () => {
        const card = spectator.query('[data-testid="picture-card"]') as HTMLAnchorElement;
        expect(card.tagName).toBe('A');
        expect(card.getAttribute('href')).toBe('/pictures/123');
    });

    it('should prevent default and emit pictureClick on regular click', () => {
        const emitSpy = jest.spyOn(spectator.component.pictureClick, 'emit');
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        const card = spectator.query('[data-testid="picture-card"]') as HTMLElement;
        card.dispatchEvent(event);

        expect(emitSpy).toHaveBeenCalledWith(mockPicture);
        expect(event.defaultPrevented).toBe(true);
    });

    it('should not emit pictureClick on Ctrl+click', () => {
        const emitSpy = jest.spyOn(spectator.component.pictureClick, 'emit');
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
        const card = spectator.query('[data-testid="picture-card"]') as HTMLElement;
        card.dispatchEvent(event);

        expect(emitSpy).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(false);
    });
});
