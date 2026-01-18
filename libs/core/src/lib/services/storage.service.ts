import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoggerService } from '../logging/logger.service';
import { WINDOW } from '../tokens/window.token';

/**
 * SSR-safe localStorage wrapper with JSON serialization support.
 *
 * Features:
 * - Automatic JSON serialization/deserialization
 * - SSR-safe (no-op on server)
 * - Type-safe get/set operations
 * - Error handling for quota exceeded and invalid JSON
 *
 * @example
 * ```typescript
 * private readonly storage = inject(StorageService);
 *
 * // Store object
 * this.storage.set('user-preferences', { theme: 'dark', lang: 'ru' });
 *
 * // Retrieve with type
 * const prefs = this.storage.get<UserPreferences>('user-preferences');
 *
 * // Remove
 * this.storage.remove('user-preferences');
 * ```
 */
@Injectable({
    providedIn: 'root',
})
export class StorageService {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly isBrowser = isPlatformBrowser(this.platformId);
    private readonly window = inject(WINDOW);
    private readonly logger =
        inject(LoggerService).withContext('StorageService');

    /**
     * Get value from localStorage
     * @param key - Storage key
     * @returns Parsed value or undefined if not found/invalid
     */
    get<T>(key: string): T | undefined {
        if (!this.isBrowser) {
            return undefined;
        }

        try {
            const value = this.window?.localStorage.getItem(key);
            // eslint-disable-next-line no-null/no-null
            if (value === null || value === undefined) {
                return undefined;
            }
            return JSON.parse(value) as T;
        } catch (error) {
            this.logger.warn(
                `Failed to parse localStorage value for key "${key}"`,
                error
            );
            return undefined;
        }
    }

    /**
     * Get raw string value from localStorage (no JSON parsing)
     * @param key - Storage key
     * @returns Raw string value or undefined
     */
    getString(key: string): string | undefined {
        if (!this.isBrowser) {
            return undefined;
        }
        return this.window?.localStorage.getItem(key) ?? undefined;
    }

    /**
     * Set value in localStorage
     * @param key - Storage key
     * @param value - Value to store (will be JSON stringified)
     * @returns true if successful, false otherwise
     */
    set<T>(key: string, value: T): boolean {
        if (!this.isBrowser) {
            return false;
        }

        try {
            this.window?.localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            // Handle quota exceeded
            if (
                error instanceof DOMException &&
                error.name === 'QuotaExceededError'
            ) {
                this.logger.error(
                    `localStorage quota exceeded for key "${key}"`,
                    error
                );
            } else {
                this.logger.error(
                    `Failed to set localStorage value for key "${key}"`,
                    error
                );
            }
            return false;
        }
    }

    /**
     * Set raw string value in localStorage (no JSON stringification)
     * @param key - Storage key
     * @param value - String value to store
     * @returns true if successful, false otherwise
     */
    setString(key: string, value: string): boolean {
        if (!this.isBrowser) {
            return false;
        }

        try {
            this.window?.localStorage.setItem(key, value);
            return true;
        } catch (error) {
            if (
                error instanceof DOMException &&
                error.name === 'QuotaExceededError'
            ) {
                this.logger.error(
                    `localStorage quota exceeded for key "${key}"`,
                    error
                );
            } else {
                this.logger.error(
                    `Failed to set localStorage value for key "${key}"`,
                    error
                );
            }
            return false;
        }
    }

    /**
     * Remove value from localStorage
     * @param key - Storage key
     */
    remove(key: string): void {
        if (!this.isBrowser) {
            return;
        }
        this.window?.localStorage.removeItem(key);
    }

    /**
     * Check if key exists in localStorage
     * @param key - Storage key
     * @returns true if key exists
     */
    has(key: string): boolean {
        if (!this.isBrowser) {
            return false;
        }
        // eslint-disable-next-line no-null/no-null
        return this.window?.localStorage.getItem(key) !== null;
    }

    /**
     * Clear all localStorage data
     * Use with caution!
     */
    clear(): void {
        if (!this.isBrowser) {
            return;
        }
        this.window?.localStorage.clear();
    }
}
