import { Component, inject } from '@angular/core';
import {
    ActivatedRoute,
    NavigationEnd,
    Router,
    RouterModule,
} from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { LayoutComponent } from './layout/layout.component';
import { LoggerService } from '@drevo-web/core';

@Component({
    imports: [RouterModule, LayoutComponent],
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
})
export class AppComponent {
    title = 'Древо';

    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly logger = inject(LoggerService).withContext('AppComponent');

    constructor() {
        this.logger.info('App initialized');
    }

    readonly showLayout = toSignal(
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            startWith(undefined),
            map(() => this.route.firstChild?.snapshot.data['layout'] !== 'none')
        ),
        { initialValue: true }
    );
}
