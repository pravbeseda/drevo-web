import { NewsService } from '../../../../services/news/news.service';
import { NewsFieldsComponent } from '../../../../shared/components/news-fields/news-fields.component';
import { NewsFields } from '../../../../shared/models/news-fields.model';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LoggerService, NotificationService, readApiErrorBody } from '@drevo-web/core';
import { NewsMeta, NewsMetaChange, NewsTopic } from '@drevo-web/shared';
import { ButtonComponent } from '@drevo-web/ui/button';
import { ButtonToggleGroupComponent, ButtonToggleOption } from '@drevo-web/ui/button-toggle-group';
import { MODAL_DATA, ModalData } from '@drevo-web/ui/modal';

export interface NewsMetaDialogData {
    readonly newsId: number;
    readonly fields: NewsFields;
    readonly rank: number;
    readonly topics: readonly NewsTopic[];
}

/** The ranks the backend knows (`params.NewsRank`), least important first. */
const RANK_OPTIONS: readonly ButtonToggleOption[] = [
    { value: 1, label: 'Пустое' },
    { value: 2, label: 'Забавно' },
    { value: 3, label: 'Повседневность' },
    { value: 4, label: 'Новость' },
    { value: 5, label: 'Важная информация' },
    { value: 6, label: 'Событие' },
    { value: 7, label: 'Крайне важно!' },
];

const KEEP_MAILING = 'keep';
type Mailing = typeof KEEP_MAILING | number;

/** The current mailing is not in the news payload, so it is left as it is unless the moderator picks one. */
const MAILING_OPTIONS: readonly ButtonToggleOption[] = [
    { value: KEEP_MAILING, label: 'Не менять' },
    { value: 0, label: 'В следующий выпуск' },
    { value: 1, label: 'Не рассылать' },
];

/** A moderator's form for what a news item has besides its text: title, day, section, rank, mailing. */
@Component({
    selector: 'app-news-meta-dialog',
    imports: [ButtonComponent, ButtonToggleGroupComponent, FormsModule, NewsFieldsComponent],
    templateUrl: './news-meta-dialog.component.html',
    styleUrl: './news-meta-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsMetaDialogComponent {
    private readonly modal = inject<ModalData<NewsMetaDialogData, NewsMeta>>(MODAL_DATA);
    private readonly newsService = inject(NewsService);
    private readonly notification = inject(NotificationService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('NewsMetaDialog');

    private readonly initial = this.modal.data;
    readonly topics = this.initial.topics;
    readonly rankOptions = RANK_OPTIONS;
    readonly mailingOptions = MAILING_OPTIONS;

    private readonly _fields = signal<NewsFields>(this.initial.fields);
    private readonly _rank = signal(this.initial.rank);
    private readonly _mailing = signal<Mailing>(KEEP_MAILING);
    private readonly _isSaving = signal(false);

    readonly fields = this._fields.asReadonly();
    readonly rank = this._rank.asReadonly();
    readonly mailing = this._mailing.asReadonly();
    readonly isSaving = this._isSaving.asReadonly();

    onFields(fields: NewsFields): void {
        this._fields.set(fields);
    }

    onRank(rank: string | number): void {
        this._rank.set(Number(rank));
    }

    onMailing(mailing: string | number): void {
        this._mailing.set(mailing === KEEP_MAILING ? KEEP_MAILING : Number(mailing));
    }

    save(): void {
        if (this._isSaving()) return;

        const { title, newsDate } = this._fields();
        if (!title.trim()) {
            this.notification.info('Введите заголовок новости');
            return;
        }
        if (!newsDate) {
            this.notification.info('Укажите дату новости');
            return;
        }

        const change = this.change();
        if (Object.keys(change).length === 0) {
            this.modal.close(undefined);
            return;
        }

        this._isSaving.set(true);
        this.logger.info('Saving news meta', { newsId: this.initial.newsId, fields: Object.keys(change) });
        this.newsService
            .updateMeta(this.initial.newsId, change)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: meta => {
                    this.notification.success('Свойства новости сохранены');
                    this.modal.close(meta);
                },
                error: (err: unknown) => {
                    this._isSaving.set(false);
                    this.logger.error('Failed to save news meta', err);
                    const message = err instanceof HttpErrorResponse ? readApiErrorBody(err)?.error : undefined;
                    this.notification.error(message ?? 'Не удалось сохранить свойства новости');
                },
            });
    }

    cancel(): void {
        this.modal.close();
    }

    /** Only what differs from what the news item has, so a change of rank does not rewrite its title. */
    private change(): NewsMetaChange {
        const { title, newsDate, topic } = this._fields();
        const mailing = this._mailing();
        const before = this.initial.fields;
        return {
            ...(title.trim() === before.title ? {} : { title: title.trim() }),
            ...(newsDate === before.newsDate ? {} : { newsDate }),
            ...(topic === undefined || topic === before.topic ? {} : { topic }),
            ...(this._rank() === this.initial.rank ? {} : { rank: this._rank() }),
            ...(mailing === KEEP_MAILING ? {} : { numlist: mailing }),
        };
    }
}
