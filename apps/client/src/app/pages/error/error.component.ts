import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ButtonComponent, IconComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-error',
    imports: [ButtonComponent, IconComponent],
    templateUrl: './error.component.html',
    styleUrl: './error.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorComponent {
    private static readonly DEFAULT_TITLE = 'Страница не найдена';
    private static readonly DEFAULT_MESSAGE =
        'Запрашиваемая страница не существует или была удалена.';

    readonly title = input(ErrorComponent.DEFAULT_TITLE, {
        transform: (value: string | undefined) =>
            value ?? ErrorComponent.DEFAULT_TITLE,
    });
    readonly message = input(ErrorComponent.DEFAULT_MESSAGE, {
        transform: (value: string | undefined) =>
            value ?? ErrorComponent.DEFAULT_MESSAGE,
    });
    readonly showHomeButton = input(false);
}
