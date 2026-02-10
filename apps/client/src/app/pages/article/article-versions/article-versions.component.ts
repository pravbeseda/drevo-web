import { ArticleHistoryService } from '../../../services/articles/article-history/article-history.service';
import { ArticleHistoryListComponent } from '../../history/tabs/articles/article-history-list/article-history-list.component';
import { ArticlePageService } from '../article-page.service';
import {
    ChangeDetectionStrategy,
    Component,
    inject,
    OnInit,
} from '@angular/core';

@Component({
    selector: 'app-article-versions',
    imports: [ArticleHistoryListComponent],
    template: '<app-article-history-list />',
    styleUrl: './article-versions.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [ArticleHistoryService],
})
export class ArticleVersionsComponent implements OnInit {
    private readonly service = inject(ArticleHistoryService);
    private readonly articlePageService = inject(ArticlePageService);

    ngOnInit(): void {
        this.service.init({ articleId: this.articlePageService.articleId });
    }
}
