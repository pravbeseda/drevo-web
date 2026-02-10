import { ArticleHistoryService } from '../../../../../services/articles/article-history/article-history.service';
import { ArticleHistoryListComponent } from '../article-history-list/article-history-list.component';
import {
    ChangeDetectionStrategy,
    Component,
    inject,
    OnInit,
} from '@angular/core';

@Component({
    selector: 'app-articles-history',
    imports: [ArticleHistoryListComponent],
    template: '<app-article-history-list />',
    styleUrl: './articles-history.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [ArticleHistoryService],
})
export class ArticlesHistoryComponent implements OnInit {
    private readonly service = inject(ArticleHistoryService);

    ngOnInit(): void {
        this.service.init();
    }
}
