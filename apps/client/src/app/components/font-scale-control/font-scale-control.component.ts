import { FontScaleService } from '../../services/font-scale/font-scale.service';
import {
    CdkConnectedOverlay,
    CdkOverlayOrigin,
} from '@angular/cdk/overlay';
import {
    ChangeDetectionStrategy,
    Component,
    inject,
    signal,
} from '@angular/core';
import { ButtonComponent, IconButtonComponent } from '@drevo-web/ui';

@Component({
    selector: 'app-font-scale-control',
    imports: [
        CdkOverlayOrigin,
        CdkConnectedOverlay,
        IconButtonComponent,
        ButtonComponent,
    ],
    templateUrl: './font-scale-control.component.html',
    styleUrl: './font-scale-control.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FontScaleControlComponent {
    private readonly fontScaleService = inject(FontScaleService);

    private readonly _isOpen = signal(false);
    readonly isOpen = this._isOpen.asReadonly();

    readonly scalePercent = this.fontScaleService.scalePercent;
    readonly canIncrease = this.fontScaleService.canIncrease;
    readonly canDecrease = this.fontScaleService.canDecrease;
    readonly isDefault = this.fontScaleService.isDefault;

    toggle(): void {
        this._isOpen.update(open => !open);
    }

    close(): void {
        this._isOpen.set(false);
    }

    onOverlayKeydown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            this.close();
        }
    }

    increase(): void {
        this.fontScaleService.increase();
    }

    decrease(): void {
        this.fontScaleService.decrease();
    }

    reset(): void {
        this.fontScaleService.reset();
    }
}
