import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { ButtonComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-reload-prompt',
    imports: [A11yModule, ButtonComponent],
    templateUrl: './reload-prompt.component.html',
    styleUrl: './reload-prompt.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        role: 'alertdialog',
        'aria-modal': 'true',
        'aria-labelledby': 'reload-prompt-title',
        'aria-describedby': 'reload-prompt-body',
    },
})
export class ReloadPromptComponent {
    readonly reload = output<void>();

    protected onReloadClick(): void {
        this.reload.emit();
    }
}
