import { Component, OnInit, signal, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { User } from '@drevo-web/shared';

@Component({
    selector: 'app-auth-status',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
        @if (isLoading()) {
            <span>Загрузка...</span>
        } @else if (user()) {
            <span>{{ user()?.name || user()?.login }}</span>
            <button type="button" (click)="logout()" [disabled]="isLoggingOut()">
                Выйти
            </button>
        } @else {
            <a routerLink="/login">Войти</a>
        }
    `,
})
export class AuthStatusComponent implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly platformId = inject(PLATFORM_ID);

    readonly user = signal<User | null>(null);
    readonly isLoading = signal(true);
    readonly isLoggingOut = signal(false);

    ngOnInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            this.isLoading.set(false);
            return;
        }

        this.authService.isLoading$.subscribe((loading) => {
            this.isLoading.set(loading);
        });

        this.authService.user$.subscribe((user) => {
            this.user.set(user);
        });
    }

    logout(): void {
        this.isLoggingOut.set(true);
        this.authService.logout().subscribe({
            next: () => {
                this.isLoggingOut.set(false);
            },
            error: () => {
                this.isLoggingOut.set(false);
            },
        });
    }
}
