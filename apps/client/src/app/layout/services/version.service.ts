import { environment } from '../../../environments/environment';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class VersionService {
    getVersion(): string {
        return environment.version;
    }
}
