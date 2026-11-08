import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * Says that the counts on screen are out of date. Has no dependencies, so any
 * domain service can report a change — and a push channel can join them later —
 * without knowing how the counts are loaded.
 */
@Injectable({ providedIn: 'root' })
export class CountsInvalidationService {
    private readonly _invalidatedSubject = new Subject<void>();

    readonly invalidated$: Observable<void> = this._invalidatedSubject.asObservable();

    invalidate(): void {
        this._invalidatedSubject.next();
    }
}
