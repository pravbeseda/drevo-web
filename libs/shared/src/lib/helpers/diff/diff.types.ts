export interface DiffChange {
    readonly type: 'equal' | 'insert' | 'delete';
    readonly text: string;
}

export interface DiffEngine {
    computeDiff(oldText: string, newText: string): DiffChange[];
}
