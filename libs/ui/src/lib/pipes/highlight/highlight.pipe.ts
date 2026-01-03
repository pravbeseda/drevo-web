import { Pipe, PipeTransform } from '@angular/core';
import { escapeHtml } from '@drevo-web/shared';

@Pipe({
    name: 'highlight',
    standalone: true,
    pure: true,
})
export class HighlightPipe implements PipeTransform {
    transform(
        text: string | null | undefined,
        phrase: string | null | undefined
    ): string {
        const raw = text ?? '';
        const term = (phrase ?? '').trim();

        if (!raw || !term) {
            return escapeHtml(raw);
        }

        const escapedText = escapeHtml(raw);
        const escapedTerm = escapeHtml(term);
        const regex = new RegExp(`(${this.escapeRegex(escapedTerm)})`, 'gi');

        return escapedText.replace(
            regex,
            '<mark class="highlighted-text">$1</mark>'
        );
    }

    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
