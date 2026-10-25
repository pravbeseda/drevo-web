/** A source line's prose and its place in the version's source. */
export interface ProseLine {
    /** 1-based line number. */
    readonly line: number;
    readonly from: number;
    readonly to: number;
    readonly text: string;
}
