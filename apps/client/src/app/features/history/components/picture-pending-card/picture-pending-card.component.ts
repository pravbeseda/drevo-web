import { PENDING_TYPE_LABELS } from '../../../../shared/constants/pending-type-labels';
import { PendingGroup } from '../../services/pictures-history.service';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconButtonComponent, IconComponent } from '@drevo-web/ui';

const MISSING_PICTURE_TITLE = 'Иллюстрация удалена';

@Component({
    selector: 'app-picture-pending-card',
    imports: [IconButtonComponent, IconComponent],
    templateUrl: './picture-pending-card.component.html',
    styleUrl: './picture-pending-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PicturePendingCardComponent {
    readonly group = input.required<PendingGroup>();
    protected readonly pendingLabels = PENDING_TYPE_LABELS;

    readonly pictureClick = output<number>();
    readonly deletePending = output<number>();

    /** A deleted picture has no page to open, so the card stops being a button. */
    protected readonly isNavigable = computed(() => !this.group().isPictureDeleted);
    protected readonly title = computed(() => this.group().currentTitle ?? MISSING_PICTURE_TITLE);
    protected readonly ariaLabel = computed(() =>
        this.isNavigable() ? `Перейти к иллюстрации: ${this.title()}` : undefined,
    );

    emitPictureClick(): void {
        if (!this.isNavigable()) return;
        this.pictureClick.emit(this.group().pictureId);
    }

    emitDeletePending(pendingId: number): void {
        this.deletePending.emit(pendingId);
    }
}
