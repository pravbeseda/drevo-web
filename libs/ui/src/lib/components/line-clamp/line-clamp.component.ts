import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    inject,
    input,
    signal,
    viewChild,
} from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
    selector: 'ui-line-clamp',
    imports: [MatTooltip],
    templateUrl: './line-clamp.component.html',
    styleUrl: './line-clamp.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[style.--lines]': 'lines()',
    },
})
export class LineClampComponent {
    readonly lines = input(2);
    readonly tooltip = input('');

    protected readonly isTruncated = signal(false);
    protected readonly contentEl = viewChild.required<ElementRef<HTMLElement>>('content');

    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        afterNextRender(() => {
            this.checkTruncation();

            if (typeof ResizeObserver !== 'undefined') {
                const observer = new ResizeObserver(() => this.checkTruncation());
                observer.observe(this.contentEl().nativeElement);
                this.destroyRef.onDestroy(() => observer.disconnect());
            }
        });
    }

    private checkTruncation(): void {
        const el = this.contentEl().nativeElement;
        this.isTruncated.set(el.scrollHeight > el.clientHeight);
    }
}
