import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { DraftInput, DraftStorageService, LoggerService } from '@drevo-web/core';
import { formatDateHeader, formatTime } from '@drevo-web/shared';
import { ConfirmationService } from '@drevo-web/ui';
import { debounceTime, firstValueFrom, Subject } from 'rxjs';

const DRAFT_SAVE_DEBOUNCE_MS = 3000;

@Injectable()
export class DraftEditorService {
    private readonly draftStorage = inject(DraftStorageService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly router = inject(Router);
    private readonly logger = inject(LoggerService).withContext('DraftEditorService');
    private readonly destroyRef = inject(DestroyRef);

    // TODO: consider refactoring to a more declarative RxJS pipeline
    // instead of imperative flags (subscriptionInitialized, lastSavedText, discarded)
    private readonly contentSubject = new Subject<DraftInput>();
    private lastSavedText: string | undefined;
    private subscriptionInitialized = false;
    private discarded = false;

    async checkDraft(route: string): Promise<string | undefined> {
        try {
            const draft = await this.draftStorage.getByRoute(route);
            if (!draft) {
                return undefined;
            }

            this.logger.info('Draft found', { route, title: draft.title, time: draft.time });

            const savedAt = this.formatSavedAt(draft.time);
            const result = await firstValueFrom(
                this.confirmationService.open({
                    title: 'Найден черновик',
                    message: `Черновик статьи «${draft.title}» сохранён ${savedAt}. Восстановить?`,
                    buttons: [
                        { key: 'discard', label: 'Удалить черновик' },
                        { key: 'restore', label: 'Восстановить', variant: 'primary' },
                    ],
                    disableClose: true,
                }),
            );

            if (result === 'restore') {
                this.logger.info('Draft restored', { route });
                return draft.text;
            }

            this.logger.info('Draft declined, deleting', { route });
            await this.draftStorage.deleteByRoute(route);
            return undefined;
        } catch (error) {
            this.logger.error('Failed to check draft', error);
            return undefined;
        }
    }

    onContentChanged(input: DraftInput): void {
        this.discarded = false;
        if (!this.subscriptionInitialized) {
            this.initSubscription();
        }
        this.contentSubject.next(input);
    }

    async discardDraft(route: string): Promise<void> {
        try {
            this.discarded = true;
            this.lastSavedText = undefined;
            await this.draftStorage.deleteByRoute(route);
            this.logger.info('Draft discarded', { route });
        } catch (error) {
            this.logger.error('Failed to discard draft', error);
        }
    }

    async confirmDiscardAndNavigate(route: string, navigateTo: readonly unknown[]): Promise<void> {
        try {
            const draft = await this.draftStorage.getByRoute(route);

            if (!draft) {
                await this.router.navigate([...navigateTo]);
                return;
            }

            const result = await firstValueFrom(
                this.confirmationService.open({
                    title: 'Удалить черновик?',
                    message: 'Вы уверены, что хотите удалить черновик? Несохранённые изменения будут потеряны.',
                    buttons: [
                        { key: 'cancel', label: 'Остаться' },
                        { key: 'confirm', label: 'Удалить', variant: 'primary' },
                    ],
                    disableClose: true,
                }),
            );

            if (result === 'confirm') {
                await this.discardDraft(route);
                await this.router.navigate([...navigateTo]);
            }
        } catch (error) {
            this.logger.error('Failed to confirm discard', error);
        }
    }

    private formatSavedAt(epochMs: number): string {
        const date = new Date(epochMs);
        const dateStr = formatDateHeader(date);
        const timeStr = formatTime(date);
        return `${dateStr}, ${timeStr}`;
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
