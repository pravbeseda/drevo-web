import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { ButtonComponent } from '@drevo-web/ui';

// Intentionally does NOT use ModalService: shown after a chunk load failure,
// when further lazy imports (including dialog infrastructure) are unreliable.
// A self-contained overlay keeps the fallback independent of the broken state.
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
    readonly dismiss = output<void>();

    protected onReloadClick(): void {
        this.reload.emit();
    }

    protected onDismissClick(): void {
        this.dismiss.emit();
    }
}
