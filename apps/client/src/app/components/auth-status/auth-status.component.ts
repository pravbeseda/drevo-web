import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../../services/auth/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';

@Component({
    selector: 'app-auth-status',
    standalone: true,
    imports: [AsyncPipe, RouterLink],
    template: `
        @if (authService.isLoading$ | async) {
            <span>Загрузка...</span>
        } @else if (authService.user$ | async; as user) {
            <span>{{ user.name || user.login }}</span>
            <button
                type="button"
                (click)="logout()"
                [disabled]="isLoggingOutSubject | async">
                Выйти
            </button>
        } @else {
            <a routerLink="/login">Войти</a>
        }
    `,
})
export class AuthStatusComponent {
    readonly authService = inject(AuthService);
    readonly isLoggingOutSubject: BehaviorSubject<boolean> = new BehaviorSubject(false);

    logout(): void {
        this.isLoggingOutSubject.next(true);
        this.authService
            .logout()
            .pipe(
                takeUntilDestroyed(),
                finalize(() => this.isLoggingOutSubject.next(false))
            )
            .subscribe();
    }
}
