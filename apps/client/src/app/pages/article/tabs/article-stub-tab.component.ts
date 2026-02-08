import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { IconComponent } from '@drevo-web/ui';
import { map } from 'rxjs/operators';

@Component({
    selector: 'app-article-stub-tab',
    imports: [IconComponent],
    template: `
        <div class="stub">
            <ui-icon
                name="construction"
                size="large" />
            <p>Раздел «{{ stubTitle() }}» в разработке</p>
        </div>
    `,
    styles: `
        .stub {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 3rem 1rem;
            color: var(--themed-text-muted);
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleStubTabComponent {
    private readonly route = inject(ActivatedRoute);

    readonly stubTitle = toSignal(
        this.route.data.pipe(map(data => data['stubTitle'] as string)),
        { initialValue: '' }
    );
}
