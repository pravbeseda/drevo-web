import { ConfirmationConfig } from './confirmation.types';
import { ConfirmationService } from './confirmation.service';
import { ModalService } from '../modal/services/modal.service';
import { createServiceFactory, mockProvider, SpectatorService } from '@ngneat/spectator/jest';
import { of } from 'rxjs';

describe('ConfirmationService', () => {
    let spectator: SpectatorService<ConfirmationService>;
    let modalService: ModalService;

    const createService = createServiceFactory({
        service: ConfirmationService,
        providers: [mockProvider(ModalService)],
    });

    beforeEach(() => {
        spectator = createService();
        modalService = spectator.inject(ModalService);
    });

    it('should call ModalService.open with correct config', () => {
        (modalService.open as jest.Mock).mockReturnValue(of('confirm'));

        const config: ConfirmationConfig = {
            title: 'Delete?',
            message: 'Are you sure?',
            buttons: [
                { key: 'cancel', label: 'Cancel' },
                { key: 'confirm', label: 'Confirm', accent: 'primary' },
            ],
        };

        spectator.service.open(config);

        expect(modalService.open).toHaveBeenCalledWith(
            expect.any(Function),
            expect.objectContaining({
                data: config,
                width: '450px',
                disableClose: false,
            }),
        );
    });

    it('should use custom width when provided', () => {
        (modalService.open as jest.Mock).mockReturnValue(of(undefined));

        const config: ConfirmationConfig = {
            title: 'Title',
            message: 'Message',
            buttons: [{ key: 'ok', label: 'OK' }],
            width: '600px',
        };

        spectator.service.open(config);

        expect(modalService.open).toHaveBeenCalledWith(
            expect.any(Function),
            expect.objectContaining({ width: '600px' }),
        );
    });

    it('should pass disableClose option', () => {
        (modalService.open as jest.Mock).mockReturnValue(of(undefined));

        const config: ConfirmationConfig = {
            title: 'Title',
            message: 'Message',
            buttons: [{ key: 'ok', label: 'OK' }],
            disableClose: true,
        };

        spectator.service.open(config);

        expect(modalService.open).toHaveBeenCalledWith(
            expect.any(Function),
            expect.objectContaining({ disableClose: true }),
        );
    });

    it('should return the result from ModalService', () => {
        (modalService.open as jest.Mock).mockReturnValue(of('confirm'));

        const config: ConfirmationConfig = {
            title: 'Title',
            message: 'Message',
            buttons: [{ key: 'confirm', label: 'OK' }],
        };

        const results: (string | undefined)[] = [];
        spectator.service.open(config).subscribe(value => results.push(value));

        expect(results).toEqual(['confirm']);
    });

    it('should return undefined when dialog is closed without selection', () => {
        (modalService.open as jest.Mock).mockReturnValue(of(undefined));

        const config: ConfirmationConfig = {
            title: 'Title',
            message: 'Message',
            buttons: [{ key: 'ok', label: 'OK' }],
        };

        const results: (string | undefined)[] = [];
        spectator.service.open(config).subscribe(value => results.push(value));

        expect(results).toEqual([undefined]);
    });
});
