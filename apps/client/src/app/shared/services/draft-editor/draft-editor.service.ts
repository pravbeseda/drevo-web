import { DraftRestoreDialogData } from '../../components/draft-restore-dialog/draft-restore-dialog.component';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { DraftInput, DraftStorageService, LoggerService } from '@drevo-web/core';
import { ModalService } from '@drevo-web/ui';
import { debounceTime, firstValueFrom, Subject } from 'rxjs';

const DRAFT_SAVE_DEBOUNCE_MS = 3000;

@Injectable()
export class DraftEditorService {
    private readonly draftStorage = inject(DraftStorageService);
    private readonly modalService = inject(ModalService);
    private readonly router = inject(Router);
    private readonly logger = inject(LoggerService).withContext('DraftEditorService');
    private readonly destroyRef = inject(DestroyRef);

    private readonly contentSubject = new Subject<DraftInput>();
    private lastSavedText: string | undefined;
    private subscriptionInitialized = false;

    async checkDraft(route: string): Promise<string | undefined> {
        try {
            const draft = await this.draftStorage.getByRoute(route);
            if (!draft) {
                return undefined;
            }

            this.logger.info('Draft found', { route, title: draft.title, time: draft.time });

            const result = await firstValueFrom(
                this.modalService.open<DraftRestoreDialogData, boolean>(
                    () =>
                        import('../../components/draft-restore-dialog/draft-restore-dialog.component').then(
                            m => m.DraftRestoreDialogComponent,
                        ),
                    {
                        data: { title: draft.title, time: draft.time },
                        disableClose: true,
                        width: '450px',
                    },
                ),
            );

            if (result) {
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
        if (!this.subscriptionInitialized) {
            this.initSubscription();
        }
        this.contentSubject.next(input);
    }

    async discardDraft(route: string): Promise<void> {
        try {
            this.lastSavedText = undefined;
            await this.draftStorage.deleteByRoute(route);
            this.logger.info('Draft discarded', { route });
        } catch (error) {
            this.logger.error('Failed to discard draft', error);
        }
    }

    async confirmDiscardAndNavigate(route: string, navigateTo: unknown[]): Promise<void> {
        try {
            const draft = await this.draftStorage.getByRoute(route);

            if (!draft) {
                await this.router.navigate(navigateTo as string[]);
                return;
            }

            const result = await firstValueFrom(
                this.modalService.open<undefined, boolean>(
                    () =>
                        import('../../components/draft-discard-dialog/draft-discard-dialog.component').then(
                            m => m.DraftDiscardDialogComponent,
                        ),
                    {
                        disableClose: true,
                        width: '400px',
                    },
                ),
            );

            if (result) {
                await this.discardDraft(route);
                await this.router.navigate(navigateTo as string[]);
            }
            // If result is false/undefined — stay on page
        } catch (error) {
            this.logger.error('Failed to confirm discard', error);
        }
    }

    private initSubscription(): void {
        this.subscriptionInitialized = true;

        this.contentSubject
            .pipe(debounceTime(DRAFT_SAVE_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
            .subscribe(input => {
                if (input.text === this.lastSavedText) {
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
