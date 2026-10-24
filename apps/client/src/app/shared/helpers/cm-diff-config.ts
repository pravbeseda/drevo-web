import { DiffConfig } from '@codemirror/merge';

/** Shared by the diff view and the moderation check, so both see the same changed lines. */
export const CM_DIFF_CONFIG: DiffConfig = {
    scanLimit: 10_000_000,
    timeout: 15000,
};
