import { ErrorComponent } from '../../../../shared/components/error/error.component';
import { WikiContentComponent } from '../../../../shared/components/wiki-content/wiki-content.component';
import { MonthTableComponent } from '../../components/month-table/month-table.component';
import { CalendarYearResolveResult } from '../../resolvers/calendar-year.resolver';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { CALENDAR_MAX_YEAR, CALENDAR_MIN_YEAR } from '@drevo-web/shared';
import { TabItem, TabsComponent } from '@drevo-web/ui';
import { map } from 'rxjs/operators';

@Component({
    selector: 'app-calendar-page',
    imports: [ErrorComponent, MonthTableComponent, TabsComponent, WikiContentComponent],
    templateUrl: './calendar-page.component.html',
    styleUrl: './calendar-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPageComponent {
    private readonly route = inject(ActivatedRoute);

    /**
     * Built from the bounds the resolver enforces, so the message and the
     * routing that produced it cannot come to disagree.
     */
    readonly notFoundMessage = `Календарь доступен только для лет с ${CALENDAR_MIN_YEAR} по ${CALENDAR_MAX_YEAR}.`;

    private readonly resolveResult = toSignal(
        this.route.data.pipe(map(data => data['calendar'] as CalendarYearResolveResult)),
    );

    readonly calendar = computed(() => {
        const result = this.resolveResult();
        return typeof result === 'object' ? result : undefined;
    });

    readonly isLoadError = computed(() => this.resolveResult() === 'load-error');

    private readonly hasYearParam = toSignal(this.route.paramMap.pipe(map(params => params.has('year'))), {
        initialValue: false,
    });

    /**
     * The year and its neighbours.
     *
     * ui-tabs marks a tab active by matching its route against the current URL,
     * and `/calendar/2026` does not match `/calendar`. So the current year's tab
     * keeps whichever of the two addresses the reader arrived by, and exactly
     * one tab is active either way.
     */
    readonly tabs = computed<TabItem[]>(() => {
        const year = this.calendar();
        if (!year) {
            return [];
        }

        const tabs: TabItem[] = [];
        if (year.prev !== undefined) {
            tabs.push({ label: String(year.prev), route: `/calendar/${year.prev}`, testId: 'year-prev' });
        }
        tabs.push({
            label: String(year.year),
            route: this.hasYearParam() ? `/calendar/${year.year}` : '/calendar',
            testId: 'year-current',
        });
        if (year.next !== undefined) {
            tabs.push({ label: String(year.next), route: `/calendar/${year.next}`, testId: 'year-next' });
        }

        return tabs;
    });

    /**
     * The cell to mark, and nothing outside the current year.
     *
     * Read once per render rather than in a computed of its own: a clock is not
     * a signal, and a calendar that repaints at midnight is not worth a timer.
     */
    readonly today = computed(() => {
        const now = new Date();
        return this.calendar()?.year === now.getFullYear() ? toIsoDate(now) : undefined;
    });
}

function toIsoDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
}
