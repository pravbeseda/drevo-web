import { environment } from '../../../environments/environment';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService, WINDOW } from '@drevo-web/core';
import { VersionInfo } from '@drevo-web/shared';
import { catchError, filter, of, Observable, Subject, switchMap, timer } from 'rxjs';

const VERSION_URL = '/version.json';

@Injectable({ providedIn: 'root' })
export class VersionCheckService {
    private readonly http = inject(HttpClient);
    private readonly document = inject(DOCUMENT);
    private readonly window = inject(WINDOW);
    private readonly logger = inject(LoggerService).withContext('VersionCheckService');
    private readonly destroyRef = inject(DestroyRef);

    private started = false;
    private currentVersion: string | undefined;

    private readonly _newVersionAvailable$ = new Subject<VersionInfo>();
    readonly newVersionAvailable$ = this._newVersionAvailable$.asObservable();

    startPolling(): void {
        if (!this.window) {
            return;
        }

        if (this.started) {
            this.logger.warn('startPolling() called more than once — ignoring');
            return;
        }
        this.started = true;

        this.fetchVersion()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(info => {
                if (info) {
                    this.currentVersion = info.version;
                    this.logger.info('Initial version loaded', { version: info.version });
                }
            });

        timer(environment.versionCheckIntervalMs, environment.versionCheckIntervalMs)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
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
                    this.currentVersion = info.version;
                }
            });
    }

    private fetchVersion(): Observable<VersionInfo | undefined> {
        const url = `${VERSION_URL}?_=${Date.now()}`;
        return this.http.get<VersionInfo>(url).pipe(
            catchError(err => {
                this.logger.warn('Failed to fetch version.json', { error: err });
                return of(undefined);
            }),
        );
    }
}
