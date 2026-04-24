import { BUILD_INFO } from '../../shared/build-info';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class VersionService {
    getVersion(): string {
        return BUILD_INFO.version;
    }
}
