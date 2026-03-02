import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Draft, DraftInput, DraftStorageService, LoggerService } from '@drevo-web/core';
import { debounceTime, Subject } from 'rxjs';

const DRAFT_SAVE_DEBOUNCE_MS = 3000;

@Injectable()
export class DraftEditorService {
    private readonly draftStorage = inject(DraftStorageService);
    private readonly logger = inject(LoggerService).withContext('DraftEditorService');
    private readonly destroyRef = inject(DestroyRef);

    private readonly contentSubject = new Subject<DraftInput>();
    private lastSavedText: string | undefined;
    private lastPendingInput: DraftInput | undefined;
    private subscriptionInitialized = false;
    private discarded = false;
    private readonly activeRoutes = new Set<string>();

    async getDraft(route: string): Promise<Draft | undefined> {
        try {
            const draft = await this.draftStorage.getByRoute(route);
            if (draft) {
                this.logger.info('Draft found', { route, title: draft.title, time: draft.time });
            }
            return draft;
        } catch (error) {
            this.logger.error('Failed to get draft', error);
            return undefined;
        }
    }

    onContentChanged(input: DraftInput): void {
        this.discarded = false;
        this.lastPendingInput = input;
        this.activeRoutes.add(input.route);
        if (!this.subscriptionInitialized) {
            this.initSubscription();
        }
        this.contentSubject.next(input);
    }

    async discardDraft(route: string): Promise<void> {
        try {
            this.discarded = true;
            this.lastSavedText = undefined;
            this.lastPendingInput = undefined;
            this.activeRoutes.delete(route);
            await this.draftStorage.deleteByRoute(route);
            this.logger.info('Draft discarded', { route });
        } catch (error) {
            this.logger.error('Failed to discard draft', error);
        }
    }

    flush(): void {
        if (this.lastPendingInput && !this.discarded && this.lastPendingInput.text !== this.lastSavedText) {
            this.saveDraft(this.lastPendingInput);
            this.lastPendingInput = undefined;
        }
    }

    hasActiveSession(route: string): boolean {
        return this.activeRoutes.has(route);
    }

    private initSubscription(): void {
        this.subscriptionInitialized = true;

        this.contentSubject
            .pipe(debounceTime(DRAFT_SAVE_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
            .subscribe(input => {
                if (this.discarded || input.text === this.lastSavedText) {
                    return;
                }
                this.saveDraft(input);
            });
    }

    private async saveDraft(input: DraftInput): Promise<void> {
        try {
            this.lastSavedText = input.text;
            await this.draftStorage.save(input);
            this.logger.debug('Draft saved', { route: input.route, length: input.text.length });
        } catch (error) {
            this.lastSavedText = undefined;
            this.logger.error('Failed to save draft', error);
        }
    }
}
