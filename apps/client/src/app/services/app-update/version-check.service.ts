import { environment } from '../../../environments/environment';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, OnDestroy } from '@angular/core';
import { LoggerService, WINDOW } from '@drevo-web/core';
import { VersionInfo } from '@drevo-web/shared';
import { catchError, filter, of, Subject, switchMap, takeUntil, timer } from 'rxjs';

const VERSION_URL = '/assets/version.json';

@Injectable({ providedIn: 'root' })
export class VersionCheckService implements OnDestroy {
    private readonly http = inject(HttpClient);
    private readonly document = inject(DOCUMENT);
    private readonly window = inject(WINDOW);
    private readonly logger = inject(LoggerService).withContext('VersionCheckService');

    private readonly destroy$ = new Subject<void>();
    private currentVersion: string | undefined;

    private readonly _newVersionAvailable$ = new Subject<VersionInfo>();
    readonly newVersionAvailable$ = this._newVersionAvailable$.asObservable();

    startPolling(): void {
        if (!this.window) {
            return;
        }

        this.fetchVersion().subscribe(info => {
            if (info) {
                this.currentVersion = info.version;
                this.logger.info('Initial version loaded', { version: info.version });
            }
        });

        timer(environment.versionCheckIntervalMs, environment.versionCheckIntervalMs)
            .pipe(
                takeUntil(this.destroy$),
                filter(() => this.document.visibilityState === 'visible'),
                switchMap(() => this.fetchVersion()),
                filter((info): info is VersionInfo => info !== undefined),
            )
            .subscribe(info => {
                if (this.currentVersion && info.version !== this.currentVersion) {
                    this.logger.info('New version detected', {
                        oldVersion: this.currentVersion,
                        newVersion: info.version,
                    });
                    this._newVersionAvailable$.next(info);
                }
            });
    }

    private fetchVersion() {
        const url = `${VERSION_URL}?_=${Date.now()}`;
        return this.http.get<VersionInfo>(url).pipe(
            catchError(err => {
                this.logger.warn('Failed to fetch version.json', { error: err });
                return of(undefined);
            }),
        );
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
