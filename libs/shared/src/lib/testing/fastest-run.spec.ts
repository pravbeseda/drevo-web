import { fastestRunMs } from './fastest-run';

describe('fastestRunMs', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should run the callback five times', () => {
        const run = jest.fn();

        fastestRunMs(run);

        expect(run).toHaveBeenCalledTimes(5);
    });

    it('should return the shortest of the sampled durations', () => {
        const readings = [0, 30, 100, 108, 200, 215, 300, 320, 400, 412];
        jest.spyOn(performance, 'now').mockImplementation(() => readings.shift() ?? 0);

        expect(fastestRunMs(() => undefined)).toBe(8);
    });
});
