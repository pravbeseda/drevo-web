import { Pipe, PipeTransform } from '@angular/core';
import { formatTime } from '@drevo-web/shared';

@Pipe({
    name: 'formatTime',
    pure: true,
})
export class FormatTimePipe implements PipeTransform {
    transform(value: Date | undefined): string {
        if (!value) return '';
        return formatTime(value);
    }
}
