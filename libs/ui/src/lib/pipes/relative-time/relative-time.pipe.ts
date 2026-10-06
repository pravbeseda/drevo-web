import { Pipe, PipeTransform } from '@angular/core';
import { formatRelativeTime } from '@drevo-web/shared';

/** How long ago a date was as of `now` — pass `ClockService.now()` so the text ages. */
@Pipe({
    name: 'relativeTime',
})
export class RelativeTimePipe implements PipeTransform {
    transform(value: Date | undefined, now: Date): string {
        return value ? formatRelativeTime(value, now) : '';
    }
}
