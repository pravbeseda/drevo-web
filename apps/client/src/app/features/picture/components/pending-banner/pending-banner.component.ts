import { PendingAction } from '../../models/pending.model';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PicturePending, PicturePendingType } from '@drevo-web/shared';
import { ButtonComponent, IconComponent } from '@drevo-web/ui';

const PENDING_LABELS: Record<PicturePendingType, string> = {
    edit_title: 'Изменение описания',
    edit_file: 'Замена файла',
    edit_both: 'Изменение описания и файла',
    delete: 'Удаление иллюстрации',
};

@Component({
    selector: 'app-pending-banner',
    imports: [ButtonComponent, IconComponent],
    templateUrl: './pending-banner.component.html',
    styleUrl: './pending-banner.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingBannerComponent {
    readonly pending = input.required<PicturePending>();
    readonly currentUserName = input.required<string>();
    readonly canModerate = input.required<boolean>();
    readonly isBusy = input(false);
    readonly action = output<{ readonly pending: PicturePending; readonly action: PendingAction }>();
    readonly imageClick = output<PicturePending>();

    readonly isOwn = computed(() => this.pending().user === this.currentUserName());
    readonly pendingLabel = computed(() => PENDING_LABELS[this.pending().pendingType]);
    readonly hasNewTitle = computed(() => {
        const pending = this.pending();
        return (
            pending.title !== undefined && (pending.pendingType === 'edit_title' || pending.pendingType === 'edit_both')
        );
    });
    readonly hasNewImage = computed(() => this.pending().pendingImageUrl !== undefined);

    emitAction(action: PendingAction): void {
        this.action.emit({ pending: this.pending(), action });
    }

    emitImageClick(): void {
        this.imageClick.emit(this.pending());
    }
}
