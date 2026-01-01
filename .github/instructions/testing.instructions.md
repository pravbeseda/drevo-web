---
applyTo: '**/*.spec.ts'
---

# Testing Guidelines

## Обязательные требования

При написании или модификации тестов **всегда** используй:

1. **Jest** — как test runner и assertion library
2. **Spectator** (@ngneat/spectator) — для тестирования Angular компонентов и сервисов

## Примеры использования

### Тестирование сервисов

```typescript
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';

describe('MyService', () => {
  let spectator: SpectatorService<MyService>;
  const createService = createServiceFactory({
    service: MyService,
    mocks: [HttpClient], // автоматический мок зависимостей
  });

  beforeEach(() => {
    spectator = createService();
  });

  it('should be created', () => {
    expect(spectator.service).toBeTruthy();
  });
});
```

### Тестирование компонентов

```typescript
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';

describe('MyComponent', () => {
  let spectator: Spectator<MyComponent>;
  const createComponent = createComponentFactory({
    component: MyComponent,
    shallow: true, // для изоляции от дочерних компонентов
    mocks: [MyService],
  });

  beforeEach(() => {
    spectator = createComponent();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });
});
```

### Тестирование HTTP сервисов

```typescript
import { createHttpFactory, SpectatorHttp } from '@ngneat/spectator/jest';

describe('ApiService', () => {
  let spectator: SpectatorHttp<ApiService>;
  const createHttp = createHttpFactory(ApiService);

  beforeEach(() => {
    spectator = createHttp();
  });

  it('should make GET request', () => {
    spectator.service.getData().subscribe();
    spectator.expectOne('/api/data', HttpMethod.GET);
  });
});
```

## Запрещено

- ❌ НЕ использовать TestBed напрямую (Spectator делает это за тебя)
- ❌ НЕ использовать Jasmine (только Jest matchers)
- ❌ НЕ использовать Karma

## Полезные Spectator фичи

- `spectator.query()` / `spectator.queryAll()` — для поиска элементов
- `spectator.click()` — для симуляции кликов
- `spectator.typeInElement()` — для ввода текста
- `spectator.detectChanges()` — для обновления view
- `mockProvider()` — для создания моков провайдеров
