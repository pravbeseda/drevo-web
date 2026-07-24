import { ArticlePageService } from '../../../../services/article-page.service';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BannerComponent, ButtonComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-article-missing-tab',
    imports: [BannerComponent, ButtonComponent],
    templateUrl: './article-missing-tab.component.html',
    styleUrl: './article-missing-tab.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleMissingTabComponent {
    private readonly pageService = inject(ArticlePageService);

    readonly title = this.pageService.title;
    readonly canCreate = this.pageService.canCreate;
    readonly createUrl = this.pageService.createUrl;
    readonly reason = computed(() => this.pageService.missing()?.reason);
}
