import { NewsFields } from '../../models/news-fields.model';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextInputComponent } from '@drevo-web/ui/text-input';

/** The title and the day of a news item; its section is picked in the sidebar, as an article's dictionaries are. */
@Component({
    selector: 'app-news-fields',
    imports: [FormsModule, TextInputComponent],
    templateUrl: './news-fields.component.html',
    styleUrl: './news-fields.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsFieldsComponent {
    readonly value = input.required<NewsFields>();
    readonly valueChange = output<NewsFields>();

    onTitle(title: string): void {
        this.valueChange.emit({ ...this.value(), title });
    }

    onDate(newsDate: string): void {
        this.valueChange.emit({ ...this.value(), newsDate });
    }
}
