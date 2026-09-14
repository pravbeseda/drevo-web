import { fastestRunMs } from './fastest-run';

describe('fastestRunMs', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should run the callback once per sample', () => {
        const run = jest.fn();

        fastestRunMs(3, run);

        expect(run).toHaveBeenCalledTimes(3);
    });

    it('should return the shortest of the sampled durations', () => {
        jest.spyOn(performance, 'now')
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(30)
            .mockReturnValueOnce(100)
            .mockReturnValueOnce(108)
            .mockReturnValueOnce(200)
            .mockReturnValueOnce(215);

        expect(fastestRunMs(3, () => undefined)).toBe(8);
    });
});
