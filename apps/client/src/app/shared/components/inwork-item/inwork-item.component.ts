import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InworkItem } from '@drevo-web/shared';
import { ConfirmationService, IconButtonComponent, IconComponent } from '@drevo-web/ui';
import { filter } from 'rxjs';

const SECONDS_PER_MINUTE = 60;

@Component({
    selector: 'app-inwork-item',
    imports: [IconComponent, IconButtonComponent],
    templateUrl: './inwork-item.component.html',
    styleUrl: './inwork-item.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InworkItemComponent {
    private readonly destroyRef = inject(DestroyRef);
    private readonly confirmationService = inject(ConfirmationService);

    readonly item = input.required<InworkItem>();
    readonly isOwn = input(false);

    readonly cancelEditing = output<string>();

    readonly ageMinutes = computed(() => Math.max(1, Math.floor(this.item().age / SECONDS_PER_MINUTE)));
    readonly editType = computed(() => (this.item().id > 0 ? 'ред.' : 'нов.'));

    onCancel(): void {
        this.confirmationService
            .open({
                title: 'Отменить редактирование?',
                message: `Метка редактирования статьи «${this.item().title}» будет снята.`,
                buttons: [
                    { key: 'confirm', label: 'Да', accent: 'primary' },
                    { key: 'cancel', label: 'Нет' },
                ],
            })
            .pipe(
                filter(result => result === 'confirm'),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(() => this.cancelEditing.emit(this.item().title));
    }
}
