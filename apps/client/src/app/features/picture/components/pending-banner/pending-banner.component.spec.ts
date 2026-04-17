import { PicturePending } from '@drevo-web/shared';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { PendingBannerComponent } from './pending-banner.component';

describe('PendingBannerComponent', () => {
    let spectator: Spectator<PendingBannerComponent>;

    const mockPending: PicturePending = {
        id: 10,
        pictureId: 42,
        pendingType: 'edit_both',
        title: 'Новое описание',
        width: 1024,
        height: 768,
        user: 'Editor',
        date: new Date('2025-03-11T10:00:00Z'),
        currentTitle: 'Старое описание',
        currentImageUrl: '/images/0000/000042.jpg',
        currentThumbnailUrl: '/pictures/thumbs/0000/000042.jpg',
        currentWidth: 800,
        currentHeight: 600,
        pendingImageUrl: '/images/pending/42_pp10.jpg',
    };

    const createComponent = createComponentFactory({
        component: PendingBannerComponent,
    });

    beforeEach(() => {
        jest.clearAllMocks();
        spectator = createComponent({
            props: {
                pending: mockPending,
                currentUserName: 'Editor',
                canModerate: false,
            },
        });
    });

    it('should show cancel button for own pending', () => {
        expect(spectator.query('[data-testid="pending-banner-cancel"]')).toBeTruthy();
        expect(spectator.query('[data-testid="pending-banner-author"]')).toBeNull();
        expect(spectator.query('[data-testid="pending-banner-approve"]')).toBeNull();
    });

    it('should show author name for foreign pending to regular user', () => {
        spectator = createComponent({
            props: {
                pending: { ...mockPending, user: 'Another User' },
                currentUserName: 'Editor',
                canModerate: false,
            },
        });

        expect(spectator.query('[data-testid="pending-banner-author"]')).toHaveText('Another User');
        expect(spectator.query('[data-testid="pending-banner-cancel"]')).toBeNull();
        expect(spectator.query('[data-testid="pending-banner-approve"]')).toBeNull();
        expect(spectator.query('[data-testid="pending-banner-reject"]')).toBeNull();
    });

    it('should show moderation buttons for foreign pending to moderator', () => {
        spectator = createComponent({
            props: {
                pending: { ...mockPending, user: 'Another User' },
                currentUserName: 'Editor',
                canModerate: true,
            },
        });

        expect(spectator.query('[data-testid="pending-banner-approve"]')).toBeTruthy();
        expect(spectator.query('[data-testid="pending-banner-reject"]')).toBeTruthy();
        expect(spectator.query('[data-testid="pending-banner-author"]')).toHaveText('Another User');
    });

    it('should render title and image previews when pending contains them', () => {
        expect(spectator.query('[data-testid="pending-banner-new-title"]')).toHaveText('Новое описание');
        const preview = spectator.query('[data-testid="pending-banner-new-image"]') as HTMLImageElement;
        expect(preview).toBeTruthy();
        expect(preview.getAttribute('src')).toBe('/images/pending/42_pp10.jpg');
    });

    it('should emit action output on button click', () => {
        const actionSpy = jest.fn();
        spectator.output('action').subscribe(actionSpy);

        spectator.click('[data-testid="pending-banner-cancel"]');

        expect(actionSpy).toHaveBeenCalledWith({ pending: expect.objectContaining({ id: 10 }), action: 'cancel' });
    });

    it('should emit imageClick output on image click', () => {
        const imageClickSpy = jest.fn();
        spectator.output('imageClick').subscribe(imageClickSpy);

        spectator.click('[data-testid="pending-banner-new-image"]');

        expect(imageClickSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 10 }));
    });
});
