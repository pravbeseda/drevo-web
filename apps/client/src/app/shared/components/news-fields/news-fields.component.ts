import { NewsFields } from '../../models/news-fields.model';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NewsTopic } from '@drevo-web/shared';
import { ButtonToggleGroupComponent, ButtonToggleOption } from '@drevo-web/ui/button-toggle-group';
import { TextInputComponent } from '@drevo-web/ui/text-input';

/** The title, the day and the section of a news item being created. */
@Component({
    selector: 'app-news-fields',
    imports: [ButtonToggleGroupComponent, FormsModule, TextInputComponent],
    templateUrl: './news-fields.component.html',
    styleUrl: './news-fields.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsFieldsComponent {
    readonly topics = input.required<readonly NewsTopic[]>();
    readonly value = input.required<NewsFields>();
    readonly valueChange = output<NewsFields>();

    readonly topicOptions = computed((): readonly ButtonToggleOption[] =>
        this.topics().map(topic => ({ value: topic.id, label: topic.title })),
    );

    onTitle(title: string): void {
        this.valueChange.emit({ ...this.value(), title });
    }

    onDate(newsDate: string): void {
        this.valueChange.emit({ ...this.value(), newsDate });
    }

    onTopic(topic: string | number): void {
        this.valueChange.emit({ ...this.value(), topic: Number(topic) });
    }
}
