import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'formatDate',
})
export class FormatDatePipe implements PipeTransform {
    transform(value: Date | undefined): string {
        if (!value) return '';
        const datePart = value.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
        const timePart = value.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
        });
        return `${datePart.replace(' г.', '')}, ${timePart}`;
    }
}
