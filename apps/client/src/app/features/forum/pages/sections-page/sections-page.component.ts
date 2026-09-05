import { ErrorComponent } from '../../../../shared/components/error/error.component';
import { ForumSectionsResolveResult } from '../../resolvers/forum-sections.resolver';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';

@Component({
    selector: 'app-sections-page',
    imports: [ErrorComponent, RouterLink],
    templateUrl: './sections-page.component.html',
    styleUrl: './sections-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionsPageComponent {
    private readonly route = inject(ActivatedRoute);

    private readonly resolveResult = toSignal(
        this.route.data.pipe(map(data => data['sections'] as ForumSectionsResolveResult)),
    );

    /** The endpoint names no entity that could be missing, so there is no «not found» arm. */
    readonly sections = computed(() => {
        const result = this.resolveResult();
        return typeof result === 'object' ? result : undefined;
    });

    readonly isLoadError = computed(() => this.resolveResult() === 'load-error');
}
