import { InworkItem } from '@drevo-web/shared';
import { ConfirmationService, IconButtonComponent } from '@drevo-web/ui';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { of } from 'rxjs';
import { InworkItemComponent } from './inwork-item.component';

function createInworkItem(overrides: Partial<InworkItem> = {}): InworkItem {
    return {
        id: 42,
        module: 'articles',
        title: 'Тестовая статья',
        author: 'Test User',
        lastTime: '2025-01-15T12:00:00',
        age: 125,
        ...overrides,
    };
}

describe('InworkItemComponent', () => {
    let spectator: Spectator<InworkItemComponent>;
    let confirmationService: jest.Mocked<ConfirmationService>;

    const createComponent = createComponentFactory({
        component: InworkItemComponent,
        providers: [
            mockProvider(ConfirmationService, {
                open: jest.fn().mockReturnValue(of('confirm')),
            }),
        ],
    });

    beforeEach(() => {
        spectator = createComponent({
            props: {
                item: createInworkItem(),
            },
        });
        confirmationService = spectator.inject(ConfirmationService) as jest.Mocked<ConfirmationService>;
    });

    it('should create', () => {
        expect(spectator.component).toBeTruthy();
    });

    it('should render item data', () => {
        expect(spectator.query('[data-testid="inwork-title"]')).toHaveText('Тестовая статья');
        expect(spectator.query('[data-testid="inwork-age"]')).toHaveText('2 мин. назад');
        expect(spectator.query('[data-testid="inwork-meta"]')).toHaveText('(ред., Test User)');
    });

    it('should render new article type when item id is zero', () => {
        spectator.setInput('item', createInworkItem({ id: 0 }));

        expect(spectator.query('[data-testid="inwork-meta"]')).toHaveText('(нов., Test User)');
    });

    it('should show cancel button for own item', () => {
        spectator.setInput('isOwn', true);

        expect(spectator.query(IconButtonComponent)?.icon()).toBe('close');
    });

    it('should not show cancel button for other users item', () => {
        expect(spectator.query('[data-testid="cancel-inwork-button"]')).toBeFalsy();
    });

    it('should emit cancel after confirmation', () => {
        spectator.setInput('isOwn', true);
        const cancelSpy = jest.fn();
        spectator.output('cancelEditing').subscribe(cancelSpy);

        spectator.query(IconButtonComponent)?.clicked.emit();

        expect(confirmationService.open).toHaveBeenCalled();
        expect(cancelSpy).toHaveBeenCalledWith('Тестовая статья');
    });

    it('should not emit cancel when confirmation is rejected', () => {
        confirmationService.open.mockReturnValue(of('cancel'));
        spectator.setInput('isOwn', true);
        const cancelSpy = jest.fn();
        spectator.output('cancelEditing').subscribe(cancelSpy);

        spectator.query(IconButtonComponent)?.clicked.emit();

        expect(cancelSpy).not.toHaveBeenCalled();
    });
});
