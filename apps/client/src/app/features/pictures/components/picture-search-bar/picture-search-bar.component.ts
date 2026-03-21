import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { TextInputComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-picture-search-bar',
    imports: [TextInputComponent],
    templateUrl: './picture-search-bar.component.html',
    styleUrl: './picture-search-bar.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PictureSearchBarComponent {
    readonly searchChange = output<string>();

    onValueChanged(value: string): void {
        this.searchChange.emit(value);
    }
}
