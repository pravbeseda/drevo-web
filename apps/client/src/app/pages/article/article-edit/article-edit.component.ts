import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EditorComponent } from '@drevo-web/editor';

@Component({
    selector: 'app-article-edit',
    imports: [EditorComponent],
    templateUrl: './article-edit.component.html',
    styleUrl: './article-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleEditComponent {}
