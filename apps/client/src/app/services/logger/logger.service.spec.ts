import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { LoggerService } from './logger.service';

// Mock the environment
jest.mock('../../../environments/environment', () => ({
    environment: {
        production: false,
    },
}));

describe('LoggerService', () => {
    let spectator: SpectatorService<LoggerService>;
    const createService = createServiceFactory({
        service: LoggerService,
    });

    beforeEach(() => {
        spectator = createService();
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should create', () => {
        expect(spectator.service).toBeTruthy();
    });

    describe('info', () => {
        it('should call console.log in non-production', () => {
            spectator.service.info('test message', 'arg1', 'arg2');
            expect(console.log).toHaveBeenCalledWith(
                'test message',
                'arg1',
                'arg2'
            );
        });
    });

    describe('warn', () => {
        it('should call console.warn in non-production', () => {
            spectator.service.warn('warning message', 'arg1');
            expect(console.warn).toHaveBeenCalledWith(
                'warning message',
                'arg1'
            );
        });
    });

    describe('error', () => {
        it('should always call console.error', () => {
            spectator.service.error('error message', 'arg1');
            expect(console.error).toHaveBeenCalledWith('error message', 'arg1');
        });
    });
});
