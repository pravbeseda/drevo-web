import { Pipe, PipeTransform } from '@angular/core';
import { formatTime } from '@drevo-web/shared';

@Pipe({
    name: 'formatTime',
    standalone: true,
    pure: true,
})
export class FormatTimePipe implements PipeTransform {
    transform(value: Date | string | undefined): string {
        if (!value) return '';
        const date = typeof value === 'string' ? new Date(value) : value;
        return formatTime(date);
    }
}
