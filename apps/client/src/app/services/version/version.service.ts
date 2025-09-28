import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class VersionService {
    getVersion(): string {
        return environment.version;
    }
}
