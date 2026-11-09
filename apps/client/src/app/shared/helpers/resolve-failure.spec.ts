import { recoverResolveFailure, skipNotFoundToast } from './resolve-failure';
import { HttpErrorResponse } from '@angular/common/http';
import { Logger, SKIP_ERROR_FOR_STATUSES } from '@drevo-web/core';
import { firstValueFrom } from 'rxjs';

describe('recoverResolveFailure', () => {
    let logger: jest.Mocked<Pick<Logger, 'error'>>;

    const recover = (error: unknown): Promise<unknown> =>
        firstValueFrom(recoverResolveFailure(logger as unknown as Logger, 'Failed to load')(error));

    beforeEach(() => {
        logger = { error: jest.fn() };
    });

    it('answers a 404 as not-found, without a log entry', async () => {
        await expect(recover(new HttpErrorResponse({ status: 404 }))).resolves.toBe('not-found');

        expect(logger.error).not.toHaveBeenCalled();
    });

    it('answers a server failure as load-error and logs its cause', async () => {
        const failure = new HttpErrorResponse({ status: 500 });

        await expect(recover(failure)).resolves.toBe('load-error');

        expect(logger.error).toHaveBeenCalledWith('Failed to load', failure);
    });

    it('answers a failure that is not an HTTP response as load-error and logs its cause', async () => {
        const failure = new Error('Network error');

        await expect(recover(failure)).resolves.toBe('load-error');

        expect(logger.error).toHaveBeenCalledWith('Failed to load', failure);
    });
});

describe('skipNotFoundToast', () => {
    it('keeps only the 404 away from the error toast', () => {
        expect(skipNotFoundToast().get(SKIP_ERROR_FOR_STATUSES)).toEqual([404]);
    });
});
