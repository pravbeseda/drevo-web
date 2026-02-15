import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'formatDate',
    pure: true,
})
export class FormatDatePipe implements PipeTransform {
    transform(value: Date | undefined): string {
        if (!value) return '';
        return value.toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
}
