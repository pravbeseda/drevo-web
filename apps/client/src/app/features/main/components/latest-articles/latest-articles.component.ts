import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-latest-articles',
    templateUrl: './latest-articles.component.html',
    styleUrl: './latest-articles.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LatestArticlesComponent {}
