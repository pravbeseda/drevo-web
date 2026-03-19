import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
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

    readonly pictureClick = output<Picture>();

    onClick(): void {
        this.pictureClick.emit(this.picture());
    }
}
