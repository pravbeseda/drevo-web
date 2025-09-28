# Implementation Plan: Version Service

## Requirements

1. Return version from environment configuration
2. Available through Angular DI  
3. Simple and maintainable solution

## Implementation Steps

**Time Estimate: 1 hour**

**Files to create:**
- `libs/shared/src/lib/services/version.service.ts`
- `libs/shared/src/lib/services/version.service.spec.ts`

**Files to modify:**
- `libs/shared/src/index.ts` (add export)

**Implementation:**
```typescript
// version.service.ts
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

**Export from Shared Library:**
```typescript
// libs/shared/src/index.ts
export * from './lib/services/version.service';
```

## Acceptance Criteria

- ✅ Service returns current environment version
- ✅ Available through DI: `constructor(private versionService: VersionService)`
- ✅ Zero performance impact (simple getter)
- ✅ All unit tests pass using Jest + Spectator
- ✅ Exported from shared library