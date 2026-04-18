import { LayoutComponent } from './layout/layout.component';
import { ReloadPromptComponent } from './layout/reload-prompt/reload-prompt.component';
import { AppUpdateService } from './services/app-update/app-update.service';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { LoggerService } from '@drevo-web/core';
import { filter, map, startWith } from 'rxjs/operators';

@Component({
    imports: [RouterModule, LayoutComponent, ReloadPromptComponent],
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
})
export class AppComponent {
    title = 'Древо';

    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly logger = inject(LoggerService).withContext('AppComponent');
    protected readonly appUpdateService = inject(AppUpdateService);

    constructor() {
        this.logger.info('App initialized');
    }

    readonly showLayout = toSignal(
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            startWith(undefined),
            map(() => this.route.firstChild?.snapshot.data['layout'] !== 'none'),
        ),
        { initialValue: true },
    );
}
