import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-article-edit',
    imports: [],
    templateUrl: './article-edit.component.html',
    styleUrl: './article-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleEditComponent {}
