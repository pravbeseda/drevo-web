import { AuthService } from '../../services/auth/auth.service';
import { AsyncPipe } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
    selector: 'app-auth-status',
    standalone: true,
    imports: [AsyncPipe, RouterLink],
    template: `
        @if (isLoading$ | async) {
            <span>Загрузка...</span>
        } @else if (user$ | async; as user) {
            <span>{{ user.name || user.login }}</span>
            <button
                type="button"
                (click)="logout()"
                [disabled]="isLoggingOut$ | async">
                Выйти
            </button>
        } @else {
            <a routerLink="/login">Войти</a>
        }
    `,
})
export class AuthStatusComponent {
    private readonly destroyRef = inject(DestroyRef);
    private readonly authService = inject(AuthService);
    private readonly isLoggingOutSubject: BehaviorSubject<boolean> =
        new BehaviorSubject(false);

    readonly isLoggingOut$ = this.isLoggingOutSubject.asObservable();
    readonly user$ = this.authService.user$;
    readonly isLoading$ = this.authService.isLoading$;

    logout(): void {
        this.isLoggingOutSubject.next(true);
        this.authService
            .logout()
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.isLoggingOutSubject.next(false))
            )
            .subscribe();
    }
}
