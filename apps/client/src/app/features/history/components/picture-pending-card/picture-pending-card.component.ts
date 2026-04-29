import { PENDING_TYPE_LABELS } from '../../../../shared/constants/pending-type-labels';
import { PendingGroup } from '../../services/pictures-history.service';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-picture-pending-card',
    imports: [IconComponent],
    templateUrl: './picture-pending-card.component.html',
    styleUrl: './picture-pending-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PicturePendingCardComponent {
    readonly group = input.required<PendingGroup>();
    protected readonly pendingLabels = PENDING_TYPE_LABELS;

    readonly pictureClick = output<number>();

    emitPictureClick(): void {
        this.pictureClick.emit(this.group().pictureId);
    }
}
