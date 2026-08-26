import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-article-of-day',
    templateUrl: './article-of-day.component.html',
    styleUrl: './article-of-day.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleOfDayComponent {}
