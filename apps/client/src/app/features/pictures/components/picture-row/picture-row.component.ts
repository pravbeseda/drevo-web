import { PictureRow } from '../../services/picture-row-builder';
import { PictureCardComponent } from '../picture-card/picture-card.component';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Picture } from '@drevo-web/shared';

@Component({
    selector: 'app-picture-row',
    imports: [PictureCardComponent],
    templateUrl: './picture-row.component.html',
    styleUrl: './picture-row.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PictureRowComponent {
    readonly row = input.required<PictureRow>();

    readonly pictureClick = output<Picture>();

    onPictureClick(picture: Picture): void {
        this.pictureClick.emit(picture);
    }
}
