import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class LoggerService {
    private isProduction = environment.production;

    log(message: string, ...args: unknown[]): void {
        if (!this.isProduction) {
            console.log(message, ...args);
        }
    }

    warn(message: string, ...args: unknown[]): void {
        if (!this.isProduction) {
            console.warn(message, ...args);
        }
    }

    error(message: string, ...args: unknown[]): void {
        // Always log errors, even in production
        console.error(message, ...args);
    }
}
