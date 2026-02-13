import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { LogDispatcher } from './log-dispatcher.service';
import { LoggerService } from './logger.service';

describe('LoggerService', () => {
    let spectator: SpectatorService<LoggerService>;

    const mockDispatcher = {
        dispatch: jest.fn(),
    };

    const createService = createServiceFactory({
        service: LoggerService,
        providers: [{ provide: LogDispatcher, useValue: mockDispatcher }],
    });

    beforeEach(() => {
        spectator = createService();
        jest.clearAllMocks();
    });

    it('should create', () => {
        expect(spectator.service).toBeTruthy();
    });

    describe('direct logging methods', () => {
        it('should dispatch debug message', () => {
            spectator.service.debug('Debug message', { key: 'value' });

            expect(mockDispatcher.dispatch).toHaveBeenCalledWith('debug', 'Debug message', undefined, { key: 'value' });
        });

        it('should dispatch info message', () => {
            spectator.service.info('Info message');

            expect(mockDispatcher.dispatch).toHaveBeenCalledWith('info', 'Info message', undefined, undefined);
        });

        it('should dispatch warn message', () => {
            spectator.service.warn('Warning message', { warning: true });

            expect(mockDispatcher.dispatch).toHaveBeenCalledWith('warn', 'Warning message', undefined, {
                warning: true,
            });
        });

        it('should dispatch error message', () => {
            const error = new Error('Test error');
            spectator.service.error('Error occurred', error);

            expect(mockDispatcher.dispatch).toHaveBeenCalledWith('error', 'Error occurred', undefined, error);
        });

        it('should dispatch with context when provided', () => {
            spectator.service.info('Message', { data: 1 }, 'MyContext');

            expect(mockDispatcher.dispatch).toHaveBeenCalledWith('info', 'Message', 'MyContext', { data: 1 });
        });
    });

    describe('withContext()', () => {
        it('should create a context-bound logger', () => {
            const logger = spectator.service.withContext('TestService');

            expect(logger).toBeDefined();
            expect(logger.debug).toBeDefined();
            expect(logger.info).toBeDefined();
            expect(logger.warn).toBeDefined();
            expect(logger.error).toBeDefined();
        });

        it('should dispatch with context from context-bound logger', () => {
            const logger = spectator.service.withContext('AuthService');

            logger.info('User logged in', { userId: 123 });

            expect(mockDispatcher.dispatch).toHaveBeenCalledWith('info', 'User logged in', 'AuthService', {
                userId: 123,
            });
        });

        it('should dispatch debug from context-bound logger', () => {
            const logger = spectator.service.withContext('Debug');

            logger.debug('Debug info');

            expect(mockDispatcher.dispatch).toHaveBeenCalledWith('debug', 'Debug info', 'Debug', undefined);
        });

        it('should dispatch warn from context-bound logger', () => {
            const logger = spectator.service.withContext('Warn');

            logger.warn('Warning!', { code: 'W001' });

            expect(mockDispatcher.dispatch).toHaveBeenCalledWith('warn', 'Warning!', 'Warn', { code: 'W001' });
        });

        it('should dispatch error from context-bound logger', () => {
            const logger = spectator.service.withContext('ErrorCtx');

            logger.error('Something failed');

            expect(mockDispatcher.dispatch).toHaveBeenCalledWith('error', 'Something failed', 'ErrorCtx', undefined);
        });

        it('should allow multiple context-bound loggers', () => {
            const logger1 = spectator.service.withContext('Service1');
            const logger2 = spectator.service.withContext('Service2');

            logger1.info('From service 1');
            logger2.info('From service 2');

            expect(mockDispatcher.dispatch).toHaveBeenCalledWith('info', 'From service 1', 'Service1', undefined);
            expect(mockDispatcher.dispatch).toHaveBeenCalledWith('info', 'From service 2', 'Service2', undefined);
        });
    });
});
