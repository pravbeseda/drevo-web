import { NEW_TOPIC_TARGET } from './new-topic-target';
import { ForumService } from '../../../services/forum/forum.service';
import { forumEditorExtensions } from '../../helpers/forum-editor-extensions';
import { TopicListPagesService } from '../../services/topic-list-pages/topic-list-pages.service';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { EditorComponent } from '@drevo-web/editor';
import { ForumCreatedTopic, ForumPostErrors, ForumPostOutcome, ForumSection } from '@drevo-web/shared';
import { ButtonComponent, ButtonToggleGroupComponent, ButtonToggleOption, TextInputComponent } from '@drevo-web/ui';
import { EMPTY, Observable } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

const NO_ERRORS: ForumPostErrors = { title: undefined, text: undefined, other: undefined };

/**
 * The form that starts a topic, opened in the panel beside the list it belongs
 * to. The list names the section — or leaves it to the reader, when it spans
 * every one — and is told to reload once the topic exists.
 */
@Component({
    selector: 'app-new-topic-page',
    imports: [ButtonComponent, ButtonToggleGroupComponent, EditorComponent, FormsModule, TextInputComponent],
    templateUrl: './new-topic-page.component.html',
    styleUrl: './new-topic-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewTopicPageComponent {
    private readonly forumService = inject(ForumService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly logger = inject(LoggerService).withContext('NewTopicPage');
    private readonly pages = inject(TopicListPagesService);
    private readonly target = inject(NEW_TOPIC_TARGET);

    private readonly _pickedSection = signal<string | undefined>(undefined);
    private readonly _title = signal('');
    private readonly _text = signal('');
    private readonly _sending = signal(false);
    private readonly _errors = signal<ForumPostErrors>(NO_ERRORS);
    private readonly _pending = signal(false);

    readonly asksForSection = computed(() => this.target().part === undefined);
    readonly title = this._title.asReadonly();
    readonly text = this._text.asReadonly();
    readonly pickedSection = this._pickedSection.asReadonly();
    readonly sending = this._sending.asReadonly();
    readonly errors = this._errors.asReadonly();
    readonly pending = this._pending.asReadonly();

    readonly sectionOptions = computed<readonly ButtonToggleOption[]>(() =>
        this.sections().map(section => ({ value: section.id, label: section.name })),
    );

    readonly canSubmit = computed(
        () =>
            !this._sending() &&
            this.part() !== undefined &&
            this._title().trim().length > 0 &&
            this._text().trim().length > 0,
    );

    protected readonly editorExtensions = forumEditorExtensions('Текст первого сообщения', () => this.submit());

    private readonly part = computed(() => this.target().part ?? this._pickedSection());

    private readonly sections = toSignal(this.loadSections(), { initialValue: [] });

    onSectionPicked(section: string | number): void {
        this._pickedSection.set(String(section));
    }

    onTitleChanged(title: string): void {
        this._title.set(title);
        this._errors.update(errors => ({ ...errors, title: undefined }));
        this._pending.set(false);
    }

    onTextChanged(text: string): void {
        // The editor echoes the text this component put into it.
        if (text === this._text()) {
            return;
        }
        this._text.set(text);
        this._errors.update(errors => ({ ...errors, text: undefined }));
        this._pending.set(false);
    }

    submit(): void {
        const part = this.part();
        if (!this.canSubmit() || part === undefined) {
            return;
        }

        this._sending.set(true);
        this._errors.set(NO_ERRORS);
        this.forumService
            .createTopic({ part, partId: this.target().partId, title: this._title(), text: this._text() })
            .pipe(
                finalize(() => this._sending.set(false)),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: outcome => this.applyOutcome(outcome, part),
                // The error toast has already told the reader; the form stays for another try.
                error: (error: unknown) => this.logger.error('Failed to start a topic', error),
            });
    }

    private applyOutcome(outcome: ForumPostOutcome<ForumCreatedTopic>, part: string): void {
        if (outcome.status === 'rejected') {
            this._errors.set(outcome.errors);
            this.logger.warn('Topic refused', { part, errors: outcome.errors });
            return;
        }

        const { topicId, approved } = outcome.result;
        this.logger.info('Topic started', { part, topicId, approved });
        if (!approved) {
            this._title.set('');
            this._text.set('');
            this._pending.set(true);
            return;
        }

        this.pages.reload();
        void this.router.navigate(['../topic', topicId], { relativeTo: this.route });
    }

    /** Only a list that spans every section leaves the choice to the reader. */
    private loadSections(): Observable<readonly ForumSection[]> {
        if (!this.asksForSection()) {
            return EMPTY;
        }

        return this.forumService.getSections().pipe(
            catchError((error: unknown) => {
                this.logger.error('Failed to load the forum sections', error);
                return EMPTY;
            }),
        );
    }
}
