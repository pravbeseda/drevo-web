import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Picture } from '@drevo-web/shared';

@Component({
    selector: 'app-picture-card',
    templateUrl: './picture-card.component.html',
    styleUrl: './picture-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PictureCardComponent {
    readonly picture = input.required<Picture>();
    readonly width = input.required<number>();
    readonly height = input.required<number>();
    readonly rowHeight = input.required<number>();

    readonly isCapped = computed(() => this.height() < this.rowHeight());
    readonly detailUrl = computed(() => `/pictures/${this.picture().id}`);

    readonly pictureClick = output<Picture>();

    onClick(event: MouseEvent): void {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
            return;
        }
        event.preventDefault();
        this.pictureClick.emit(this.picture());
    }
}
