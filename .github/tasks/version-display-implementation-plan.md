# Implementation Plan: Version Service

## Requirements

1. Return version from environment configuration
2. Available through Angular DI  
3. Simple and maintainable solution

## Implementation Steps

**Time Estimate: 1 hour**

**Files to create:**
- `apps/client/src/app/services/version.service.ts`
- `apps/client/src/app/services/version.service.spec.ts`

**Implementation:**
```typescript
// apps/client/src/app/services/version.service.ts
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class VersionService {
  getVersion(): string {
    return environment.version;
  }
}
```

**Testing Requirements:**
- Use Jest + Spectator (NO TestBed)
- Mock environment in tests
- Test both development and production scenarios

**Usage:**
```typescript
// Import directly from app services
import { VersionService } from './services/version.service';

constructor(private versionService: VersionService) {}
```

## Acceptance Criteria

- ✅ Service returns current environment version
- ✅ Available through DI: `constructor(private versionService: VersionService)`
- ✅ Zero performance impact (simple getter)
- ✅ All unit tests pass using Jest + Spectator
- ✅ Available within client app