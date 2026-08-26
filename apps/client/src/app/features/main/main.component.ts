import { ArticleOfDayComponent } from './components/article-of-day/article-of-day.component';
import { DayCardComponent } from './components/day-card/day-card.component';
import { LatestArticlesComponent } from './components/latest-articles/latest-articles.component';
import { MonthCalendarComponent } from './components/month-calendar/month-calendar.component';
import { PopularArticlesComponent } from './components/popular-articles/popular-articles.component';
import { SectionsComponent } from './components/sections/sections.component';
import { SiteNumbersComponent } from './components/site-numbers/site-numbers.component';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-main',
    imports: [
        ArticleOfDayComponent,
        DayCardComponent,
        LatestArticlesComponent,
        MonthCalendarComponent,
        PopularArticlesComponent,
        SectionsComponent,
        SiteNumbersComponent,
    ],
    templateUrl: './main.component.html',
    styleUrl: './main.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainComponent {}
