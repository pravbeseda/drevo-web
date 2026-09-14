/**
 * Duration of the fastest of `samples` runs, in milliseconds.
 *
 * For scan guards that compare two timings as a ratio. Contention from other suites can only
 * add time, so the fastest run is the closest reading of the real cost; a single reading lets
 * one unlucky pause decide the comparison.
 */
export function fastestRunMs(samples: number, run: () => void): number {
    let best = Infinity;

    for (let i = 0; i < samples; i++) {
        const started = performance.now();
        run();
        best = Math.min(best, performance.now() - started);
    }

    return best;
}
