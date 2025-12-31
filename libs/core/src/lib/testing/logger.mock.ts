import { LoggerService, Logger } from '../services/logger.service';

/**
 * Mock logger for testing
 * All methods are jest.fn() for easy assertion
 */
export interface MockLogger extends Logger {
    debug: jest.Mock;
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
}

/**
 * Creates a fresh mock logger instance
 */
export function createMockLogger(): MockLogger {
    return {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };
}

/**
 * Mock LoggerService that returns mock loggers via withContext()
 * Use mockLoggerService.mockLogger to access the logger returned by withContext()
 */
export class MockLoggerService {
    readonly mockLogger: MockLogger = createMockLogger();

    withContext(_context: string): MockLogger {
        return this.mockLogger;
    }

    // Direct methods for cases where LoggerService is used without withContext
    debug = jest.fn();
    info = jest.fn();
    warn = jest.fn();
    error = jest.fn();
}

/**
 * Provider for use in test configurations
 *
 * Usage:
 * ```typescript
 * const createService = createServiceFactory({
 *     service: MyService,
 *     providers: [mockLoggerProvider()],
 * });
 *
 * // In test:
 * const loggerService = spectator.inject(LoggerService) as MockLoggerService;
 * expect(loggerService.mockLogger.error).toHaveBeenCalledWith('message', data);
 * ```
 */
export function mockLoggerProvider() {
    return {
        provide: LoggerService,
        useClass: MockLoggerService,
    };
}
