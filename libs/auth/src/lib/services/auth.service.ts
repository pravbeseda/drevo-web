import { Injectable, computed, inject, signal } from '@angular/core';
import { PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { catchError, of, tap, timeout } from 'rxjs';
import { AuthApiService } from './auth-api.service';
import { AuthState, LoginRequest, User, initialAuthState } from '../models';

const AUTH_STATE_KEY = makeStateKey<AuthState>('authState');

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly authApi = inject(AuthApiService);
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly _state = signal<AuthState>(initialAuthState);

  readonly user = computed(() => this._state().user);
  readonly isAuthenticated = computed(() => this._state().user !== null);
  readonly isLoading = computed(() => this._state().isLoading);
  readonly error = computed(() => this._state().error);
  readonly isInitialized = computed(() => this._state().isInitialized);

  readonly displayName = computed(() => {
    const user = this._state().user;
    return user?.name || user?.login || 'Гость';
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const transferredState = this.transferState.get(AUTH_STATE_KEY, null);
      if (transferredState) {
        this._state.set(transferredState);
        this.transferState.remove(AUTH_STATE_KEY);
      }
    }
  }

  initialize(): Promise<void> {
    if (this._state().isInitialized) {
      return Promise.resolve();
    }

    // SSR: skip HTTP request, use TransferState instead
    if (isPlatformServer(this.platformId)) {
      const serverState: AuthState = {
        user: null,
        isLoading: false,
        error: null,
        isInitialized: true,
      };
      this._state.set(serverState);
      this.transferState.set(AUTH_STATE_KEY, serverState);
      return Promise.resolve();
    }

    this._state.update((s) => ({ ...s, isLoading: true }));

    return new Promise((resolve) => {
      this.authApi
        .getCurrentUser()
        .pipe(
          timeout(5000),
          tap((response) => {
            const newState: AuthState = {
              user: response.success ? response.user ?? null : null,
              isLoading: false,
              error: null,
              isInitialized: true,
            };

            this._state.set(newState);
          }),
          catchError(() => {
            const errorState: AuthState = {
              user: null,
              isLoading: false,
              error: null,
              isInitialized: true,
            };

            this._state.set(errorState);

            return of(null);
          })
        )
        .subscribe(() => resolve());
    });
  }

  async login(credentials: LoginRequest): Promise<boolean> {
    this._state.update((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const response = await new Promise<{
        success: boolean;
        message?: string;
        user?: User;
      }>((resolve, reject) => {
        this.authApi.login(credentials).subscribe({
          next: (res) => resolve(res),
          error: (err) => reject(err),
        });
      });

      if (response.success && response.user) {
        this._state.update((s) => ({
          ...s,
          user: response.user ?? null,
          isLoading: false,
          error: null,
        }));
        return true;
      } else {
        this._state.update((s) => ({
          ...s,
          isLoading: false,
          error: response.message || 'Ошибка авторизации',
        }));
        return false;
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Ошибка сети';
      this._state.update((s) => ({
        ...s,
        isLoading: false,
        error: message,
      }));
      return false;
    }
  }

  async logout(): Promise<void> {
    this._state.update((s) => ({ ...s, isLoading: true }));

    try {
      await new Promise<void>((resolve) => {
        this.authApi.logout().subscribe({
          next: () => resolve(),
          error: () => resolve(),
        });
      });
    } finally {
      this._state.update((s) => ({
        ...s,
        user: null,
        isLoading: false,
        error: null,
      }));
    }
  }

  clearError(): void {
    this._state.update((s) => ({ ...s, error: null }));
  }
}
