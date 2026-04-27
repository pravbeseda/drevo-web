import { PendingGroup } from '../../services/pictures-history.service';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PicturePendingType } from '@drevo-web/shared';
import { IconComponent } from '@drevo-web/ui';

const PENDING_LABELS: Record<PicturePendingType, string> = {
    edit_title: 'Изменение описания',
    edit_file: 'Замена файла',
    edit_both: 'Изменение описания и файла',
    delete: 'Удаление',
};

@Component({
    selector: 'app-picture-pending-card',
    imports: [IconComponent],
    templateUrl: './picture-pending-card.component.html',
    styleUrl: './picture-pending-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PicturePendingCardComponent {
    readonly group = input.required<PendingGroup>();

    readonly pictureClick = output<number>();

    getPendingLabel(pendingType: PicturePendingType): string {
        return PENDING_LABELS[pendingType];
    }

    emitPictureClick(): void {
        this.pictureClick.emit(this.group().pictureId);
    }
}
