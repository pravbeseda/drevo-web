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
    readonly title = input('Страница не найдена');
    readonly message = input('Запрашиваемая страница не существует или была удалена.');
    readonly showHomeButton = input(true);
}
