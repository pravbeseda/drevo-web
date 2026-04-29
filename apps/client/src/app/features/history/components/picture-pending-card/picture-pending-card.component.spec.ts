import { PicturePendingCardComponent } from './picture-pending-card.component';
import { PendingGroup } from '../../services/pictures-history.service';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { PicturePending } from '@drevo-web/shared';

const createPending = (overrides: Partial<PicturePending> = {}): PicturePending => ({
    id: 1,
    pictureId: 10,
    pendingType: 'edit_title',
    title: 'New Title',
    width: undefined,
    height: undefined,
    user: 'otheruser',
    date: new Date('2026-04-25'),
    currentTitle: 'Old Title',
    currentImageUrl: '/images/folder/000010.jpg',
    currentThumbnailUrl: '/pictures/thumbs/folder/000010.jpg',
    currentWidth: 800,
    currentHeight: 600,
    pendingImageUrl: undefined,
    ...overrides,
});

const createGroup = (overrides: Partial<PendingGroup> = {}): PendingGroup => ({
    pictureId: 10,
    currentTitle: 'Old Title',
    currentThumbnailUrl: '/pictures/thumbs/folder/000010.jpg',
    items: [createPending()],
    ...overrides,
});

describe('PicturePendingCardComponent', () => {
    let spectator: Spectator<PicturePendingCardComponent>;

    const createComponent = createComponentFactory({
        component: PicturePendingCardComponent,
    });

    beforeEach(() => {
        spectator = createComponent({
            props: {
                group: createGroup(),
            },
        });
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should display picture title', () => {
        expect(spectator.query('[data-testid="pending-card-title"]')?.textContent?.trim()).toBe('Old Title');
    });

    it('should display thumbnail', () => {
        const img = spectator.query<HTMLImageElement>('[data-testid="pending-card-thumbnail"]');
        expect(img?.src).toContain('/pictures/thumbs/folder/000010.jpg');
    });

    it('should display pending type label', () => {
        expect(spectator.query('[data-testid="pending-item-type"]')?.textContent?.trim()).toBe('Изменение описания');
    });

    it('should display author name', () => {
        expect(spectator.query('[data-testid="pending-item-author"]')?.textContent?.trim()).toBe('otheruser');
    });

    it('should emit pictureClick on card click', () => {
        const spy = jest.spyOn(spectator.component.pictureClick, 'emit');
        spectator.click('[data-testid="pending-card"]');
        expect(spy).toHaveBeenCalledWith(10);
    });

    it('should show delete label for delete type', () => {
        spectator = createComponent({
            props: {
                group: createGroup({ items: [createPending({ pendingType: 'delete' })] }),
            },
        });

        expect(spectator.query('[data-testid="pending-item-type"]')?.textContent?.trim()).toBe('Удаление иллюстрации');
    });

    it('should show multiple pending items in a group', () => {
        spectator = createComponent({
            props: {
                group: createGroup({
                    items: [createPending({ id: 1 }), createPending({ id: 2, pendingType: 'edit_file', user: 'user2' })],
                }),
            },
        });

        expect(spectator.queryAll('[data-testid="pending-item"]')).toHaveLength(2);
    });

    it('should show edit_file label', () => {
        spectator = createComponent({
            props: {
                group: createGroup({ items: [createPending({ pendingType: 'edit_file' })] }),
            },
        });

        expect(spectator.query('[data-testid="pending-item-type"]')?.textContent?.trim()).toBe('Замена файла');
    });

    it('should show edit_both label', () => {
        spectator = createComponent({
            props: {
                group: createGroup({ items: [createPending({ pendingType: 'edit_both' })] }),
            },
        });

        expect(spectator.query('[data-testid="pending-item-type"]')?.textContent?.trim()).toBe(
            'Изменение описания и файла',
        );
    });

    it('should emit pictureClick on Enter keydown', () => {
        const spy = jest.spyOn(spectator.component.pictureClick, 'emit');
        spectator.dispatchKeyboardEvent('[data-testid="pending-card"]', 'keydown', 'Enter');
        expect(spy).toHaveBeenCalledWith(10);
    });

    it('should emit pictureClick on Space keydown', () => {
        const spy = jest.spyOn(spectator.component.pictureClick, 'emit');
        spectator.dispatchKeyboardEvent('[data-testid="pending-card"]', 'keydown', ' ');
        expect(spy).toHaveBeenCalledWith(10);
    });
});
