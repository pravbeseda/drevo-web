import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EditorComponent } from '@drevo-web/editor';
import { ArticleService } from '../../../services/article/article.service';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { Article } from '@drevo-web/shared';

@Component({
    selector: 'app-article-edit',
    imports: [EditorComponent, AsyncPipe],
    providers: [ArticleService],
    templateUrl: './article-edit.component.html',
    styleUrl: './article-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleEditComponent {
    readonly article$: Observable<Article>;

    constructor(private readonly articleService: ArticleService) {
        this.article$ = this.articleService.getVersion(1);
    }
}
