import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-popular-articles',
    templateUrl: './popular-articles.component.html',
    styleUrl: './popular-articles.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopularArticlesComponent {}
