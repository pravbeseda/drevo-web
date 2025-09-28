import { Injectable, Inject, InjectionToken } from '@angular/core';

export const VERSION_CONFIG = new InjectionToken<{ version: string }>('VERSION_CONFIG');

@Injectable({ providedIn: 'root' })
export class VersionService {
  constructor(@Inject(VERSION_CONFIG) private config: { version: string }) {}

  getVersion(): string {
    return this.config.version;
  }
}