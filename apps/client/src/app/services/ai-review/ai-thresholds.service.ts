import { AiThresholds } from './ai-review.model';
import { DEFAULT_AI_THRESHOLDS } from './jev-questionnaire';
import { Injectable, inject, signal } from '@angular/core';
import { LoggerService, StorageService } from '@drevo-web/core';

export const AI_THRESHOLDS_STORAGE_KEY = 'drevo-ai-thresholds';

function isProbability(value: unknown): value is number {
    return typeof value === 'number' && value >= 0 && value <= 1;
}

export function isValidAiThresholds(value: unknown): value is AiThresholds {
    if (typeof value !== 'object' || !value || !('finding' in value) || !('hint' in value)) return false;
    const { finding, hint } = value;
    // A zero hint threshold would turn every clean paragraph into a hint.
    return isProbability(finding) && isProbability(hint) && hint > 0 && hint <= finding;
}

/** The moderator's own thresholds for the AI answers, kept in this browser. */
@Injectable({
    providedIn: 'root',
})
export class AiThresholdsService {
    private readonly storage = inject(StorageService);
    private readonly logger = inject(LoggerService).withContext('AiThresholdsService');

    private readonly _thresholds = signal(this.readStored());
    readonly thresholds = this._thresholds.asReadonly();

    save(thresholds: AiThresholds): void {
        if (!isValidAiThresholds(thresholds)) return;

        this.storage.set(AI_THRESHOLDS_STORAGE_KEY, thresholds);
        this._thresholds.set(thresholds);
        this.logger.info('AI thresholds saved', thresholds);
    }

    private readStored(): AiThresholds {
        const stored = this.storage.get<unknown>(AI_THRESHOLDS_STORAGE_KEY);
        return isValidAiThresholds(stored) ? stored : DEFAULT_AI_THRESHOLDS;
    }
}
