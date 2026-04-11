# Branch migration: standalone → main, iframe freeze, new release pipeline

## 1. Overview

### Goal

1. Заморозить старую iframe-версию приложения на отдельной ветке `iframe`, сохранив возможность при необходимости «разморозить» CI для хотфиксов.
2. Сделать ветку `main` основной веткой разработки, переместив в неё текущее содержимое `standalone` без переписывания истории и без force-push.
3. Настроить на новой `main` две deploy-цели:
    - **beta** — push в main → date-based версия → `drevo-beta` (порт 4010, существующий).
    - **release** — тэг `v*` → semver версия + GitHub Release → `drevo-release` (порт 4011, новый).
4. Сохранить уже задеплоенные iframe-приложения (`drevo-staging`, `drevo-production`) рабочими; CI/CD для них перевести в «ручной» режим (`workflow_dispatch`) на ветке `iframe`.

### Ключевые свойства плана

- **Non-destructive git**: никаких force-push'ей. Переход `standalone → main` реализуется fast-forward'ом, т.к. `main` — прямой предок `standalone` (fork-point = текущий HEAD main, `61cc2a9`).
- **Reversible**: safety-тэги на текущие HEAD'ы `main` и `standalone`, PM2 dump backup, каждая фаза имеет rollback-инструкцию.
- **Phased**: 12 фаз (0–11) с контрольной точкой после каждой + опциональная Phase 12 (follow-up). Фазы можно прерывать и возобновлять.
- **Минимальный downtime beta**: запланированное окно недоступности beta-деплоя ≈ от начала фазы 5 до конца фазы 8 (должно укладываться в минуты-десятки минут при непрерывной работе).

## 2. Target state

### Git

```
main              — активная разработка, default branch (было: standalone)
iframe            — замороженная старая версия (было: main @61cc2a9)
(standalone)      — удалена
```

Существующие тэги `0.0.1`…`0.0.18` остаются привязаны к своим коммитам (они внутри истории `iframe`). Новые релизы на main используют стандартный `v*` (например, `v0.1.0`). Хотфиксы iframe (если будут) используют префикс `iframe-v*` — но триггерятся только вручную.

### PM2 / server

| PM2 name | Port | BASE_PATH | Роль | Ветка |
|---|---|---|---|---|
| `drevo-staging` | 4001 | `/staging` | iframe beta (legacy) | iframe |
| `drevo-production` | 4002 | `/` | iframe release (legacy) | iframe |
| `drevo-beta` | 4010 | `/` | main beta (date version) | main |
| `drevo-release` | 4011 | `/` | main release (semver) | main tag `v*` |

### GitHub Actions workflows

**На main:**
- `cd-main-beta.yml` — push/PR → lint+test+build+playwright; на push дополнительно deploy в drevo-beta + Sentry source maps
- `cd-main-release.yml` — тэг `v*` → полный CI + build + deploy в drevo-release + GitHub Release + Sentry source maps
- `coverage.yml` — push в main → публикация coverage-репортов на GitHub Pages
- `playwright.yml` — push/PR → Playwright integration tests
- `security-scan.yml` — push `**` + PR `main`/`iframe` → gitleaks
- `playwright-cross-browser.yml` — manual (workflow_dispatch)

**На iframe:**
- `ci-iframe.yml` — push/PR → lint+test+build (safety net для хотфиксов)
- `cd-iframe-staging.yml` — workflow_dispatch → deploy в drevo-staging
- `cd-iframe-release.yml` — workflow_dispatch с input'ом `tag` → deploy в drevo-production
- `security-scan.yml` (тот же файл, триггерится и здесь через `push: ['**']`)

### GitHub Environments

- `staging` (legacy, для iframe)
- `production` (legacy, для iframe)
- `beta` — **новый**, для drevo-beta
- `release` — **новый**, для drevo-release

### Branch protection

- `main`: required PR, 0 reviewers, required status checks (lint, test, build), no force-push, no deletion
- `iframe`: no force-push, no deletion

## 3. Decisions summary

| # | Topic | Decision |
|---|---|---|
| 1 | Git strategy | Fast-forward rename (non-destructive) |
| 2 | standalone branch fate | Delete after flip |
| 3 | iframe CI level | Variant C: CI auto on PR, CD manual (workflow_dispatch) |
| 4 | Gitleaks scope | push `['**']` + PR `main`/`iframe` |
| 5 | Tag prefixes | `v*` for main, `iframe-v*` for iframe (manual only) |
| 6 | Existing tags 0.0.1–0.0.18 | Unchanged |
| 7 | drevo-standalone rename | Rename to drevo-beta (with server migration) |
| 8 | New release PM2 name | `drevo-release` on port 4011 |
| 9 | action.yml refactor | Now — parameterize pm2-app-name, remove if-chain |
| 10 | Workflow structure on main | Variant A: two self-contained files |
| 11 | Sentry source maps | Yes for both beta and release |
| 12 | GH Environments | Create new `beta` and `release` (do not reuse `standalone`) |
| 13 | Tag release tests | Full test run before deploy |
| 14 | Branch protection on main | Variant C: required PR + status checks |
| 15 | Safety nets | Pre-migration git tags + PM2 dump backup |

## 4. Pre-migration state (snapshot for reference)

- `origin/main` HEAD: `61cc2a9` (Merge PR #15 fix/prettier)
- `origin/standalone` HEAD: `f14fb0a` (Merge PR #162)
- Default branch: `standalone`
- Open PRs: none
- Common ancestor main ↔ standalone: `61cc2a9` (= main's HEAD)
- Latest release tag: `0.0.18` (2025-10-09)

### Preexisting anti-patterns to fix during migration

1. `cd-staging.yml` использует `workflow_run` → убираем (self-contained workflow в iframe-варианте).
2. `action.yml` содержит хардкод if-чейна с именами PM2-приложений → заменяем на явный input.
3. `.github/branch-protection.yml` описывает несуществующие ветки `staging`/`production` → удаляем.
4. `security-scan.yml` пропускает `fix/*`, `test/*`, `chore/*` и другие ветки → расширяем до `['**']`.
5. `standalone.yml` триггерится на `pull_request: [standalone]` — после переноса на main работа с PR будет автоматической.

## 5. Phases

Каждая фаза завершается явным **Checkpoint**: пока он не подтверждён, следующая фаза не начинается. Rollback-инструкции приведены для каждой значимой фазы.

---

### Phase 0 — Safety snapshot

**Goal**: создать точки отката до начала любых изменений.

**Steps**:

1. Убедиться, что локальный репо чист и синхронизирован:
    ```bash
    git fetch --all --prune
    git status
    ```
2. Поставить safety-тэги:
    ```bash
    git tag pre-migration-main-$(date +%Y%m%d) origin/main
    git tag pre-migration-standalone-$(date +%Y%m%d) origin/standalone
    git push origin refs/tags/pre-migration-main-* refs/tags/pre-migration-standalone-*
    ```
3. Зафиксировать серверное состояние. На сервере:
    ```bash
    pm2 save
    cp ~/.pm2/dump.pm2 ~/.pm2/dump.pm2.pre-migration
    pm2 list > ~/pm2-list-pre-migration.txt
    # опционально: бэкап текущих symlink'ов
    ls -la ~/releases/ > ~/releases-pre-migration.txt
    ```
4. Зафиксировать текущие nginx-конфиги (если нужно):
    ```bash
    sudo nginx -T > ~/nginx-pre-migration.txt
    ```

**Checkpoint**:
- `git tag -l 'pre-migration-*'` показывает два тэга, `git ls-remote --tags origin 'pre-migration-*'` показывает их на remote.
- `~/.pm2/dump.pm2.pre-migration` существует.
- `~/pm2-list-pre-migration.txt` содержит три процесса (`drevo-staging`, `drevo-production`, `drevo-standalone`).

**Rollback**: ничего не трогаем, просто бросаем тэги: `git tag -d pre-migration-...` и `git push --delete origin pre-migration-...`.

---

### Phase 1 — Refactor deploy-подсистемы (action.yml / deploy.sh / ecosystem.config.js)

**Goal**: устранить анти-паттерн с if-чейном в `action.yml`, подготовить `ecosystem.config.js` к новым PM2-приложениям, обновить валидации в `deploy.sh`. Никаких серверных изменений, никакого изменения поведения. Старый `standalone.yml` продолжает деплоить в `drevo-standalone`.

**Branch**: `refactor/deploy-infrastructure` (от standalone)

**Changes**:

1. **`.github/actions/deploy/action.yml`** — добавить новые inputs и убрать if-chain:
    ```yaml
    inputs:
        pm2-app-name:
            description: 'PM2 application name (e.g. drevo-beta, drevo-release)'
            required: true
        target-path-name:
            description: 'Name used in ~/releases/{name}/ and ~/releases/{name}-current (e.g. beta, release, staging)'
            required: true
        # ... existing inputs ...
    ```
    Удалить оба блока `if [ "${{ inputs.environment }}" = ... ]` (в deploy и в verify), заменить на прямое использование `${{ inputs.pm2-app-name }}` и `${{ inputs.target-path-name }}`. `environment` input оставляем, но он становится чисто информативным (используется только в логах и в GitHub environment).

2. **`scripts/deploy.sh`** — заменить хардкод-регулярки на общие проверки:
    ```bash
    # Было: if [[ ! "$ENVIRONMENT" =~ ^(staging|production|standalone)$ ]]
    # Стало: принимаем любой алфавитно-символьный environment
    if [[ ! "$ENVIRONMENT" =~ ^[a-z][a-z0-9-]*$ ]]; then
        log_error "Environment must be lowercase alphanumeric with dashes, got: $ENVIRONMENT"
        exit 1
    fi
    if [[ ! "$APP_NAME" =~ ^drevo-[a-z0-9-]+$ ]]; then
        log_error "App name must match drevo-*, got: $APP_NAME"
        exit 1
    fi
    ```
    Также удалить legacy-ветки поддержки старого 2/3-аргументного формата вызова — они не используются (`action.yml` вызывает с 4 аргументами). Это уменьшает поверхность ошибки.

3. **`scripts/ecosystem.config.js`** — добавить два новых PM2-блока **рядом** с существующими (не удаляя drevo-standalone!):
    - `drevo-beta` — точная копия `drevo-standalone`, но с `cwd: '.../releases/beta-current'`, `log_file: '.../logs/beta-*.log'`, name: `drevo-beta`. PORT: 4010.
    - `drevo-release` — новая конфигурация на PORT 4011, `cwd: '.../releases/release-current'`, логи `release-*.log`, name: `drevo-release`.

    Временное наличие и drevo-standalone и drevo-beta — ожидаемо. Старый удалится в Phase 3.

4. **`.github/workflows/standalone.yml`** — обновить вызов action.yml (но НЕ менять target/app name):
    ```yaml
    - name: Deploy
      uses: ./.github/actions/deploy
      with:
          environment: 'standalone'
          pm2-app-name: 'drevo-standalone'     # пока ещё старое
          target-path-name: 'standalone'       # пока ещё старое
          # ... остальные параметры ...
    ```

**PR**: `refactor/deploy-infrastructure` → `standalone`. Merge после успешного CI.

**Checkpoint**:
- Merge прошёл, CI зелёный.
- Push в standalone после merge отработал: deploy в drevo-standalone успешен (URL отдаёт свежую date-версию).
- На сервере `pm2 status` показывает, что `drevo-standalone` рестартовал и работает.

**Rollback**: revert merge commit → push → CI переразвернёт предыдущую версию. Safety-тэги не трогаются.

---

### Phase 2 — Серверная миграция (создание drevo-beta и drevo-release)

**Goal**: на сервере создать два новых PM2-приложения. drevo-standalone пока остаётся работать.

**Steps** (выполняются на сервере под пользователем github-deploy):

1. **Подготовить каталоги и симлинки для drevo-beta**:
    ```bash
    # Создать каталог beta и симлинк beta-current, указав его на существующий релиз standalone
    STANDALONE_CURRENT=$(readlink ~/releases/standalone-current)
    mkdir -p ~/releases/beta
    # Скопировать (или симлинковать) текущий standalone-релиз в beta/, чтобы drevo-beta стартовал на существующем билде
    CURRENT_VERSION=$(basename "$STANDALONE_CURRENT")
    cp -rP ~/releases/standalone/"$CURRENT_VERSION" ~/releases/beta/"$CURRENT_VERSION"
    ln -sfn ~/releases/beta/"$CURRENT_VERSION" ~/releases/beta-current
    ```
2. **Остановить старый drevo-standalone** (если используется порт 4010, новый drevo-beta не сможет подняться на том же порту одновременно — придётся принять секундный даунтайм):
    ```bash
    pm2 stop drevo-standalone
    pm2 delete drevo-standalone
    ```
3. **Запустить drevo-beta** из свежего `ecosystem.config.js` (который уже был залит в Phase 1):
    ```bash
    # Файл находится в ~/ecosystem.config.js (обновляется каждым deploy'ем через scp в action.yml)
    pm2 start ~/ecosystem.config.js --only drevo-beta
    ```
4. **Проверить**, что drevo-beta поднялся и отвечает на 4010:
    ```bash
    pm2 show drevo-beta
    curl -sS http://localhost:4010 | head -20
    ```
5. **Подготовить drevo-release** — каталог и запуск (на том же билде, т.к. пока нет отдельного):
    ```bash
    mkdir -p ~/releases/release
    cp -rP ~/releases/beta/"$CURRENT_VERSION" ~/releases/release/"$CURRENT_VERSION"
    ln -sfn ~/releases/release/"$CURRENT_VERSION" ~/releases/release-current
    pm2 start ~/ecosystem.config.js --only drevo-release
    curl -sS http://localhost:4011 | head -20
    ```
6. **Обновить nginx**: добавить новый server/location-блок, проксирующий внешний URL релиза на `127.0.0.1:4011`. Примерный шаблон — скопировать существующий блок для `drevo-production` и заменить порт/имя. Перезагрузить nginx: `sudo nginx -t && sudo nginx -s reload`.
7. **Сохранить PM2 dump**: `pm2 save`.

**Checkpoint**:
- `pm2 list` показывает **четыре** процесса: `drevo-staging`, `drevo-production`, `drevo-beta`, `drevo-release`.
- `drevo-standalone` отсутствует.
- Внешний URL beta (тот же, что был у standalone) отдаёт корректный HTML.
- Внешний URL release отдаёт HTML (тот же билд, что и beta — временно, пока не задеплоим через CI).
- Лог `pm2 logs drevo-beta` чистый, `drevo-release` — тоже.

**Rollback**:
```bash
pm2 delete drevo-beta drevo-release
cp ~/.pm2/dump.pm2.pre-migration ~/.pm2/dump.pm2
pm2 resurrect
# nginx вернуть в прежнее состояние (удалить release-блок, reload)
```

---

### Phase 3 — Перевод standalone workflow на drevo-beta

**Goal**: обновить `standalone.yml`, чтобы он деплоил в `drevo-beta`. Удалить блок `drevo-standalone` из `ecosystem.config.js`.

**Branch**: `refactor/standalone-to-beta` (от standalone)

**Changes**:

1. **`.github/workflows/standalone.yml`** — в шаге Deploy заменить:
    ```yaml
    environment: 'beta'           # было 'standalone'
    pm2-app-name: 'drevo-beta'    # было 'drevo-standalone'
    target-path-name: 'beta'      # было 'standalone'
    ```
    Также передать корректный `environment` на уровне job:
    ```yaml
    deploy:
        environment: beta  # было standalone — это GH environment, который нужно создать в Phase 4
    ```
    **Важно**: эту строку можно оставить как `standalone` до Phase 4, и обновить уже в Phase 5 вместе с переносом на `cd-main-beta.yml`. Альтернативно — создать GH environment `beta` до merge этого PR.

2. **`scripts/ecosystem.config.js`** — удалить блок `drevo-standalone` целиком (drevo-beta и drevo-release остаются).

3. **`scripts/deploy.sh`** — никаких изменений: регулярки уже обобщены в Phase 1.

**PR**: `refactor/standalone-to-beta` → `standalone`. Merge после успешного CI.

**Checkpoint**:
- Merge прошёл, CI зелёный, деплой отработал.
- Новая дата-версия видна на beta URL.
- `pm2 show drevo-beta` — uptime сброшен (свежий reload).
- `~/.pm2/dump.pm2` обновлён (`pm2 save` автоматически вызывается в `deploy.sh`).

**Rollback**: revert merge, переразвернуть. Если серверная часть Phase 2 уже сделана — временно можно вручную вернуть drevo-standalone: `cp ~/.pm2/dump.pm2.pre-migration ~/.pm2/dump.pm2 && pm2 resurrect`, но обычно этого не требуется.

---

### Phase 4 — GitHub Environments

**Goal**: создать новые GH environments `beta` и `release` с соответствующими vars.

**Steps** (в GitHub web UI, Settings → Environments):

1. Создать environment **`beta`**:
    - Вариант протекции: no required reviewers.
    - **Variables**: скопировать значения из существующего `standalone` environment (если были). Минимум — `BETA_URL` (если используется).
    - **Secrets**: SSH_PRIVATE_KEY, SSH_KNOWN_HOSTS, SSH_USER, SSH_HOST, SSH_PORT, SENTRY_DSN, SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT — либо на уровне environment, либо использовать repo-level.
    - **Рекомендация**: SSH-secrets держать на repo-level (используются во всех окружениях, сервер один); SENTRY_DSN и SENTRY_AUTH_TOKEN — на environment level, если хочется разделить release/beta по проектам в Sentry.

2. Создать environment **`release`**:
    - Тот же набор, + `RELEASE_URL` var (внешний URL релизного приложения).
    - Optional: настроить required reviewers = self (чтобы дополнительно подтверждать production-деплой через GH UI).

3. (Опционально) Удалить environment `standalone`, когда всё заработает — это уже Phase 10.

**Checkpoint**: в GitHub Settings → Environments видны `beta` и `release` с корректными vars/secrets.

**Rollback**: удалить созданные environments — всё.

---

### Phase 5 — Подготовка новых workflow'ов на standalone

**Goal**: на ветке standalone создать `cd-main-beta.yml` и `cd-main-release.yml`, обновить `coverage.yml`/`playwright.yml`/`security-scan.yml`, **удалить** устаревшие `ci.yml`/`cd-staging.yml`/`cd-production.yml`/`standalone.yml` и stale-конфиг `.github/branch-protection.yml`.

**Критично**: **это самая хрупкая фаза** — после merge этого PR и до завершения Phase 7 (git flip) автоматический deploy beta НЕ РАБОТАЕТ. Поэтому фазы 5→6→7 нужно делать одним сфокусированным заходом без длительных перерывов.

**Branch**: `refactor/new-main-workflows` (от standalone)

**Changes**:

1. **Создать `.github/workflows/cd-main-beta.yml`** на базе текущего `standalone.yml`:
    ```yaml
    name: CD Main Beta

    on:
        push:
            branches: [main]
        pull_request:
            branches: [main]

    permissions:
        contents: read

    jobs:
        ci:
            # Скопировать блок ci из standalone.yml, заменив
            # nrwl/nx-set-shas с main-branch-name на 'main'
            ...

        deploy:
            if: github.event_name == 'push' && github.ref == 'refs/heads/main'
            needs: ci
            runs-on: ubuntu-latest
            environment: beta
            steps:
                # Скопировать шаги deploy из standalone.yml, ВАЖНО:
                # - environment: 'beta'
                # - pm2-app-name: 'drevo-beta'
                # - target-path-name: 'beta'
                ...
    ```

2. **Создать `.github/workflows/cd-main-release.yml`** на базе `cd-production.yml` + упрощения (semver из тэга остаётся):
    ```yaml
    name: CD Main Release

    on:
        push:
            tags: ['v*']

    permissions:
        contents: write  # для создания GH Release

    jobs:
        ci:
            # Полный CI перед деплоем (решение 4.4): lint, test, build
            runs-on: ubuntu-latest
            steps:
                - uses: actions/checkout@v4
                - ... lint/test/build ...

        deploy:
            needs: ci
            runs-on: ubuntu-latest
            environment: release
            steps:
                # Взять steps из cd-production.yml:
                # - get_version (из тэга)
                # - generate_changelog
                # - sed APP_VERSION и SENTRY_DSN (как в standalone.yml)
                # - build production
                # - upload sourcemaps to Sentry
                # - deploy через action:
                #     environment: 'release'
                #     pm2-app-name: 'drevo-release'
                #     target-path-name: 'release'
                # - softprops/action-gh-release
    ```

3. **Обновить `.github/workflows/coverage.yml`**:
    ```yaml
    on:
        push:
            branches: [main]   # было [standalone]
        workflow_dispatch:
    ```

4. **Обновить `.github/workflows/playwright.yml`**:
    ```yaml
    on:
        push:
            branches: [main]   # было [standalone]
        pull_request:
            branches: [main]   # было [standalone]
    ```

5. **Обновить `.github/workflows/security-scan.yml`**:
    ```yaml
    on:
        push:
            branches: ['**']
        pull_request:
            branches: [main, iframe]
    ```

6. **Удалить**:
    - `.github/workflows/ci.yml`
    - `.github/workflows/cd-staging.yml`
    - `.github/workflows/cd-production.yml`
    - `.github/workflows/standalone.yml`
    - `.github/branch-protection.yml`

7. (Не обязательно в этой фазе, но можно заодно) обновить `apps/client/proxy.conf.json` — не требует правки.

**PR**: `refactor/new-main-workflows` → `standalone`. Merge после зелёного CI.

**Checkpoint**:
- Merge прошёл.
- После merge на standalone НЕ запустился ни один deploy-workflow (это ожидаемо: `cd-main-beta.yml` триггерится только на main, на standalone больше нет deploy-файлов).
- В `.github/workflows/` остались: `cd-main-beta.yml`, `cd-main-release.yml`, `coverage.yml`, `playwright.yml`, `playwright-cross-browser.yml`, `security-scan.yml`. Старые файлы отсутствуют.
- Важно: beta сейчас НЕ обновляется автоматически. Это временное состояние, которое закроется в Phase 7.

**Rollback**: revert merge commit. Старые workflow'ы вернутся, deploy в drevo-beta восстановится (т.к. standalone.yml уже указывает на drevo-beta после Phase 3).

---

### Phase 6 — Подготовка ветки iframe

**Goal**: создать ветку `iframe` из `origin/main` (`61cc2a9`), запушить туда iframe-specific workflow'ы. **main при этом не трогается.**

**Steps**:

1. Создать локальную ветку `iframe`:
    ```bash
    git fetch origin
    git checkout -b iframe origin/main
    ```
2. Создать файлы:
    - **`.github/workflows/ci-iframe.yml`** — на базе существующего `ci.yml`, триггер:
        ```yaml
        on:
            push:
                branches: [iframe]
            pull_request:
                branches: [iframe]
        ```
        Обновить `nrwl/nx-set-shas` → `main-branch-name: 'iframe'`.
    - **`.github/workflows/cd-iframe-staging.yml`** — self-contained (без `workflow_run`), триггер только ручной:
        ```yaml
        name: CD iframe Staging (manual)

        on:
            workflow_dispatch:
                inputs:
                    ref:
                        description: 'Branch/SHA to deploy'
                        required: true
                        default: 'iframe'

        jobs:
            deploy:
                runs-on: ubuntu-latest
                environment: staging
                steps:
                    - uses: actions/checkout@v4
                      with:
                          ref: ${{ inputs.ref }}
                    # далее — скопировать build + deploy шаги из cd-staging.yml,
                    # передать в action:
                    #     environment: 'staging'
                    #     pm2-app-name: 'drevo-staging'
                    #     target-path-name: 'staging'
        ```
    - **`.github/workflows/cd-iframe-release.yml`** — триггер только ручной, с вводом тэга:
        ```yaml
        name: CD iframe Release (manual)

        on:
            workflow_dispatch:
                inputs:
                    tag:
                        description: 'Existing tag to release (e.g. iframe-v0.0.19)'
                        required: true

        jobs:
            deploy:
                runs-on: ubuntu-latest
                environment: production
                steps:
                    - uses: actions/checkout@v4
                      with:
                          ref: ${{ inputs.tag }}
                    # steps из cd-production.yml без автотриггера;
                    # APP_VERSION = inputs.tag без префикса iframe-v;
                    # передать в action:
                    #     environment: 'production'
                    #     pm2-app-name: 'drevo-production'
                    #     target-path-name: 'production'
        ```
    - **`.github/workflows/security-scan.yml`** — обновить под новый scope:
        ```yaml
        on:
            push:
                branches: ['**']
            pull_request:
                branches: [main, iframe]
        ```

    Удалить файлы:
    - `.github/workflows/ci.yml`
    - `.github/workflows/cd-staging.yml`
    - `.github/workflows/cd-production.yml`

    **Внимание**: в iframe нет файлов `standalone.yml`/`coverage.yml`/`playwright.yml`, т.к. на момент форка main они ещё не были добавлены. Это норма — iframe их не видит и не запускает.

    **Также**: в iframe ещё нет нового `action.yml` и `ecosystem.config.js` (они были refactored в Phase 1 на standalone, iframe форкнулся раньше). Для iframe-workflow'ов нужно **cherry-pick'ом** или прямым копированием перенести на iframe:
    - `.github/actions/deploy/action.yml` (refactored версия)
    - `scripts/deploy.sh` (refactored версия)
    - `scripts/ecosystem.config.js` (нам нужны блоки `drevo-staging`, `drevo-production` и обязательно `drevo-beta`/`drevo-release`, чтобы при случайном запуске деплой iframe не перезаписал беты — хотя action.yml теперь передаёт pm2-app-name явно, но сам файл ecosystem.config.js копируется целиком на сервер и мог бы перезаписать конфиг beta/release с порта 4010/4011).

    **Важное уточнение по ecosystem.config.js**: на iframe надо положить **полный** файл с всеми четырьмя PM2-приложениями (drevo-staging + drevo-production + drevo-beta + drevo-release), иначе деплой iframe перезапишет ecosystem.config.js на сервере, удалив оттуда beta/release и порт 4010/4011 перестанет подниматься после reboot сервера.

    Проще всего — взять соответствующие файлы из standalone HEAD и скопировать в iframe:
    ```bash
    git checkout iframe
    git checkout origin/standalone -- \
        .github/actions/deploy/action.yml \
        scripts/deploy.sh \
        scripts/ecosystem.config.js
    ```

3. Commit и push:
    ```bash
    git add -A
    git commit -m "chore(iframe): freeze iframe branch with manual-only CD workflows"
    git push -u origin iframe
    ```

**Checkpoint**:
- `origin/iframe` существует, HEAD — один коммит поверх `61cc2a9`.
- `origin/main` — без изменений (все ещё `61cc2a9`).
- В `iframe` файлы: `ci-iframe.yml`, `cd-iframe-staging.yml`, `cd-iframe-release.yml`, `security-scan.yml`, refactored `action.yml`, `deploy.sh`, `ecosystem.config.js` с 4 PM2-блоками.
- В `iframe` НЕТ: `ci.yml`, `cd-staging.yml`, `cd-production.yml`, `standalone.yml`.

**Rollback**: `git push --delete origin iframe && git branch -D iframe`. Всё.

---

### Phase 7 — Git flip

**Goal**: перевести `main` на содержимое `standalone`, сменить default branch, удалить standalone.

**Steps**:

1. Fast-forward main to standalone:
    ```bash
    git checkout main
    git fetch origin
    git merge --ff-only origin/standalone
    git push origin main
    ```
    Это fast-forward push, не force-push — он пройдёт без `--force`.

2. Сменить default branch в GitHub:
    - Settings → General → Default branch → switch from `standalone` to `main`.
    - GitHub автоматически переадресует ссылки.

3. Удалить ветку standalone:
    ```bash
    git push --delete origin standalone
    git branch -D standalone
    ```

4. Настроить branch protection (Variant C, решение 5.1):
    - **main**:
        - Require pull request before merge: ON, required approvals: 0.
        - Require status checks to pass: ON — добавить checks из cd-main-beta.yml (`ci`).
        - Restrict force pushes: ON.
        - Restrict deletions: ON.
    - **iframe**:
        - Restrict force pushes: ON.
        - Restrict deletions: ON.
        - (PR не обязателен, status checks — опционально.)

5. Локально обновить `origin/HEAD`:
    ```bash
    git remote set-head origin -a
    ```

**Checkpoint**:
- `git ls-remote --heads origin` показывает `main` и `iframe`, но не `standalone`.
- `origin/main` HEAD = `f14fb0a` (бывший standalone HEAD).
- GitHub default branch = `main`.
- Branch protection включена.
- Никаких безуспешных push'ей/force'ов не было.

**Rollback** (если что-то пошло не так ДО удаления standalone):
- Сменить default branch обратно на `standalone`.
- `git reset --hard pre-migration-main-YYYYMMDD && git push --force-with-lease origin main` — откатывает main к `61cc2a9`. Это форс-push, но в аварийном сценарии оправдан.
- Если standalone уже удалена: восстановить из safety tag: `git branch standalone pre-migration-standalone-YYYYMMDD && git push -u origin standalone`.

---

### Phase 8 — Smoke-test beta deploy

**Goal**: убедиться, что `cd-main-beta.yml` срабатывает и реально деплоит в drevo-beta.

**Steps**:

1. Создать маленький PR в main (например, правка `README-deployment.md` или добавление строки в `CLAUDE.md`):
    ```bash
    git checkout -b smoke/beta-deploy-check main
    # внести тривиальную правку
    git commit -am "chore: smoke-test main beta deploy pipeline"
    git push -u origin smoke/beta-deploy-check
    gh pr create --base main --title "chore: smoke-test main beta deploy" --body "Verifies cd-main-beta.yml runs correctly after branch migration"
    ```
2. Дождаться CI на PR (checks должны пройти — это проверит Phase 5 на уровне workflow).
3. Merge PR в main.
4. Наблюдать за `cd-main-beta.yml` в Actions:
    - job `ci` — зелёный
    - job `deploy` — зелёный
    - в логах deploy видно «version: <date>», `pm2-app-name: drevo-beta`, `target-path-name: beta`
5. Проверить beta URL в браузере — показывает новую date-версию в `version-display` компоненте.
6. Проверить Sentry — появился новый release ID с date-версией, source maps загружены.

**Checkpoint**:
- `cd-main-beta.yml` отработал зелёным.
- beta URL показывает свежую версию.
- Sentry отрапортовал новый release.

**Rollback**: если deploy упал — идёт стандартная отладка; откатывать миграцию не нужно, проблема локализована в workflow-файле.

---

### Phase 9 — Smoke-test release deploy

**Goal**: проверить, что `cd-main-release.yml` корректно обрабатывает тэг `v*`, деплоит в `drevo-release`, создаёт GitHub Release и грузит source maps в Sentry.

**Steps**:

1. На свежей main создать тэг (рекомендую начать с `v0.1.0` — явно отличается от старой iframe-нумерации `0.0.x`):
    ```bash
    git checkout main
    git pull
    git tag -a v0.1.0 -m "First release from new main branch"
    git push origin v0.1.0
    ```
2. Наблюдать за `cd-main-release.yml` в Actions:
    - job `ci` (full test run) — зелёный
    - job `deploy` — зелёный
    - в логах: semver из тэга, `pm2-app-name: drevo-release`, sentry release `v0.1.0`
    - GitHub Release создан автоматически с changelog
3. Проверить release URL — отдаёт v0.1.0 билд.
4. Проверить Sentry → Releases — новый release `v0.1.0` с source maps.

**Checkpoint**:
- Workflow отработал зелёным.
- GitHub Release `v0.1.0` виден в Releases tab.
- release URL отдаёт свежий билд.
- Sentry показывает release v0.1.0.

**Rollback**: если pipeline упал — отладить workflow; откатывать миграцию не нужно. При необходимости — `git push --delete origin v0.1.0` и `gh release delete v0.1.0`.

---

### Phase 10 — Cleanup

**Goal**: убрать временные подпорки, удалить старый GH environment.

**Steps**:

1. Удалить safety-тэги (через 1–2 недели после успеха миграции):
    ```bash
    git push --delete origin pre-migration-main-YYYYMMDD pre-migration-standalone-YYYYMMDD
    git tag -d pre-migration-main-YYYYMMDD pre-migration-standalone-YYYYMMDD
    ```
2. Удалить GH environment `standalone` (Settings → Environments → delete).
3. Удалить PM2 dump backup на сервере:
    ```bash
    rm ~/.pm2/dump.pm2.pre-migration ~/pm2-list-pre-migration.txt ~/releases-pre-migration.txt ~/nginx-pre-migration.txt
    ```
4. Удалить на сервере старый каталог `~/releases/standalone/` (он больше не используется, beta живёт в `~/releases/beta/`):
    ```bash
    rm -rf ~/releases/standalone ~/releases/standalone-current ~/releases/standalone-previous
    rm -f ~/logs/standalone-*.log
    ```

**Checkpoint**: репо и сервер в финальном состоянии, без временных артефактов.

**Rollback**: недоступен (удалены последние точки отката). Это финальная фаза; выполнять её только после длительного безоблачного периода работы новой main.

---

### Phase 11 — Документация (README.md, CLAUDE.md)

**Goal**: отразить новую структуру веток в документации.

**Branch**: `docs/branch-migration-update` (от main)

**Changes**:

1. **`README-deployment.md`** — обновить:
    - Описание веток: `main` — active, `iframe` — frozen legacy.
    - Pipeline: `cd-main-beta.yml` на push, `cd-main-release.yml` на тэг.
    - Таблица PM2-приложений: добавить `drevo-beta` (4010), `drevo-release` (4011).
    - Раздел «Hotfix iframe» — как вручную запускать `cd-iframe-staging.yml` / `cd-iframe-release.yml` через Actions UI.

2. **`CLAUDE.md`** (корень, project instructions) — добавить раздел «Branches»:
    ```markdown
    ## Branches

    - `main` — active development, default branch. Push triggers beta deploy (drevo-beta, port 4010). Tag `v*` triggers release deploy (drevo-release, port 4011).
    - `iframe` — frozen legacy (old Yii-era wrapper). CI runs automatically on PR; CD is manual-only via workflow_dispatch. Hotfix tags: `iframe-v*`.
    ```
    И обновить раздел «Commands»/«Project Structure», если в нём упоминается `standalone`.

3. **`libs/*/README.md`** — проверить, нет ли упоминаний `standalone` branch. Если есть — заменить на `main`.

4. **`docs/pm2-setup.md`**, **`docs/server-github-setup.md`** — актуализировать PM2-приложения и environment'ы.

5. **`docs/plans/branch-migration/plan.md`** (этот файл) — оставить как исторический артефакт, добавив в начало пометку «Completed YYYY-MM-DD».

**PR**: `docs/branch-migration-update` → `main`. Merge после зелёного CI.

**Checkpoint**: документация отражает текущую структуру; ни одно упоминание `standalone` (как ветки) не остаётся.

---

### Phase 12 (OPTIONAL, follow-up) — Upgrade release trigger: `workflow_dispatch` + auto-bump

**Статус**: **необязательная**. Не блокирует миграцию. Выполнять через 2–4 недели после завершения Phase 11 — после того как новый pipeline стабилизируется и будет сделано 1–3 успешных релиза через обычный `git tag`.

**Goal**: заменить/дополнить триггер `cd-main-release.yml` с «push tag `v*`» на ручной `workflow_dispatch` с автоматическим semver-bump. Устранить класс ошибок «поставил тэг не на ту версию / не на тот коммит / забыл запушить».

#### Motivation

Текущий подход (Phase 9: `git tag vX.Y.Z && git push origin vX.Y.Z`) имеет три слабости, которые реально выстреливают в solo-dev сценарии:

1. **Версию выбирает человек по памяти.** Через месяц между релизами легко забыть, какая была предыдущая, и поставить `v0.2.0` вместо `v0.1.1` (или наоборот).
2. **Тэг можно поставить на любой коммит**, включая WIP-ветку или красный main. Никакой валидации. Один неаккуратный `git tag v1.0.0 HEAD~5 && git push origin v1.0.0` — и в прод уехал билд пятидневной давности.
3. **Легко забыть push.** `git tag vX.Y.Z` без `git push origin vX.Y.Z` = тишина, релиза нет, но локально «кажется, что он есть».

`workflow_dispatch` с auto-bump закрывает все три:

- Версия вычисляется автоматически из последнего тэга + `bump_type` (patch/minor/major), ввод руками не нужен.
- Workflow валидирует, что запущен на `main` и что HEAD зелёный перед созданием тэга.
- Тэг создаётся **внутри** CI, запустив `git push` нативно от GitHub Actions — «забыть push» невозможно.
- Environment `release` уже имеет `required reviewers = self` (из Phase 4) → дополнительный click-to-confirm через GH UI.
- Аудит-лог в Actions: кто когда какую версию выпустил, на каком SHA — всё видно.

#### Non-goals

- **Не переходим на Release Please / semantic-release.** Это следующий шаг, но требует дисциплины Conventional Commits — вернёмся к этому через 3–6 месяцев, когда новый main устаканится.
- **Не удаляем триггер на `push tags: ['v*']`.** Оставляем оба триггера параллельно: новый (`workflow_dispatch`) — основной, старый (`tags`) — backup на случай, если workflow_dispatch по какой-то причине недоступен или нужно вручную запустить релиз из коммита с уже существующим тэгом.

#### Design

**Вариант реализации**: один workflow `cd-main-release.yml` с двумя триггерами и compute-version job.

```yaml
name: CD Main Release

on:
    push:
        tags: ['v*']                    # backup: ручной git tag всё ещё работает
    workflow_dispatch:
        inputs:
            bump_type:
                description: 'Semver bump'
                required: true
                type: choice
                options: [patch, minor, major]
            dry_run:
                description: 'Dry run: compute version but do not create tag/deploy'
                required: false
                type: boolean
                default: false

permissions:
    contents: write  # для создания тэга и GH Release

concurrency:
    group: release
    cancel-in-progress: false

jobs:
    compute-version:
        # Job запускается только для workflow_dispatch;
        # на push tag мы уже знаем версию из github.ref_name
        if: github.event_name == 'workflow_dispatch'
        runs-on: ubuntu-latest
        outputs:
            version: ${{ steps.bump.outputs.version }}
            tag: ${{ steps.bump.outputs.tag }}
        steps:
            - name: Guard — only from main
              if: github.ref != 'refs/heads/main'
              run: |
                  echo "::error::workflow_dispatch for releases is only allowed from main (current: ${{ github.ref }})"
                  exit 1

            - uses: actions/checkout@v4
              with:
                  fetch-depth: 0  # нужна вся история тэгов
                  ref: main

            - name: Guard — HEAD must be green
              env:
                  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
              run: |
                  # Проверить, что последний CI-прогон на этом SHA зелёный
                  SHA=$(git rev-parse HEAD)
                  status=$(gh api "repos/${{ github.repository }}/commits/$SHA/check-runs" \
                      --jq '[.check_runs[] | select(.name == "ci")] | map(.conclusion) | unique')
                  echo "CI check-runs on $SHA: $status"
                  if ! echo "$status" | grep -q '"success"'; then
                      echo "::error::Latest CI on main ($SHA) is not green. Refusing to release."
                      exit 1
                  fi

            - name: Compute next version
              id: bump
              run: |
                  latest=$(git describe --tags --abbrev=0 --match 'v*' 2>/dev/null || echo "v0.0.0")
                  current="${latest#v}"
                  IFS='.' read -r major minor patch <<< "$current"
                  case "${{ inputs.bump_type }}" in
                      major) major=$((major+1)); minor=0; patch=0 ;;
                      minor) minor=$((minor+1)); patch=0 ;;
                      patch) patch=$((patch+1)) ;;
                  esac
                  new_version="${major}.${minor}.${patch}"
                  new_tag="v${new_version}"

                  # Sanity: тэг ещё не существует
                  if git rev-parse "$new_tag" >/dev/null 2>&1; then
                      echo "::error::Tag $new_tag already exists"
                      exit 1
                  fi

                  echo "version=$new_version" >> "$GITHUB_OUTPUT"
                  echo "tag=$new_tag" >> "$GITHUB_OUTPUT"
                  echo "Latest: $latest → next ($inputs.bump_type): $new_tag"

            - name: Create and push tag
              if: ${{ !inputs.dry_run }}
              run: |
                  git config user.name "github-actions[bot]"
                  git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
                  git tag -a "${{ steps.bump.outputs.tag }}" -m "Release ${{ steps.bump.outputs.version }}"
                  git push origin "${{ steps.bump.outputs.tag }}"

            - name: Dry run summary
              if: ${{ inputs.dry_run }}
              run: |
                  echo "::notice::DRY RUN — would create tag ${{ steps.bump.outputs.tag }} and release"

    release:
        # Запускается в двух случаях:
        # 1) push тэга v* (классический путь — остался как backup)
        # 2) workflow_dispatch после compute-version (не dry_run)
        if: |
            github.event_name == 'push' ||
            (github.event_name == 'workflow_dispatch' && !inputs.dry_run)
        needs: [compute-version]
        # needs-условие для workflow_dispatch → в push'е needs пустой
        # (в GH Actions needs выполняется только если upstream job реально запущен)
        runs-on: ubuntu-latest
        environment: release
        steps:
            - name: Resolve version
              id: version
              run: |
                  if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
                      echo "version=${{ needs.compute-version.outputs.version }}" >> "$GITHUB_OUTPUT"
                      echo "tag=${{ needs.compute-version.outputs.tag }}" >> "$GITHUB_OUTPUT"
                  else
                      TAG="${GITHUB_REF_NAME}"
                      echo "version=${TAG#v}" >> "$GITHUB_OUTPUT"
                      echo "tag=$TAG" >> "$GITHUB_OUTPUT"
                  fi

            - uses: actions/checkout@v4
              with:
                  fetch-depth: 0
                  ref: ${{ steps.version.outputs.tag }}

            # ... далее как в оригинальном cd-main-release.yml:
            # - setup-node
            # - install
            # - sed APP_VERSION + SENTRY_DSN
            # - nx build
            # - upload sourcemaps to Sentry
            # - deploy через .github/actions/deploy
            # - softprops/action-gh-release
```

**Ключевые особенности**:

1. **`concurrency: release`** — только один релиз одновременно. Защищает от двух параллельных workflow_dispatch.
2. **Guard на main** — нельзя запустить workflow_dispatch с другой ветки (в UI это возможно, но workflow откажется).
3. **Guard на зелёный CI** — проверяет через `gh api`, что check-run `ci` на HEAD main успешен. Если красный — отказ.
4. **Dry run** — input `dry_run: true` позволяет увидеть, какая версия была бы создана, без реального создания тэга. Полезно для sanity-check перед первым «настоящим» запуском.
5. **Двойной триггер** — push тэга оставлен как fallback. Если вдруг захочется руками поставить `iframe-v0.0.19`-style тэг или любой другой edge case — старый путь работает.
6. **`compute-version` и `release` — разные jobs** — чтобы логика bump'а была изолирована и легко тестировалась отдельно от тяжёлого deploy-job'а.

#### Branch

`refactor/release-workflow-dispatch` от main.

#### Changes

1. **`.github/workflows/cd-main-release.yml`** — обновить по схеме выше.
2. **`docs/plans/branch-migration/plan.md`** — отметить Phase 12 как завершённую (после успешного smoke-test).
3. **`CLAUDE.md`** или **`README-deployment.md`** — обновить раздел «Release workflow»:
    ```markdown
    ## Release workflow

    **Primary (recommended):** GitHub Actions → `CD Main Release` → Run workflow → select `main` → choose bump type (patch/minor/major) → Run.

    **Backup:** manual `git tag -a vX.Y.Z -m "..." && git push origin vX.Y.Z` — also works, pipeline identical.
    ```

#### Validation plan

1. **Dry run** через workflow_dispatch с `bump_type: patch, dry_run: true`. Ожидаемое: job `compute-version` печатает «next version = vN.M.(P+1)», job `release` не запускается. Нет нового тэга.
2. **Dry run с `bump_type: minor`** — проверить, что patch сбрасывается в 0.
3. **Реальный запуск** с `bump_type: patch, dry_run: false` — создаётся настоящий тэг, отрабатывает full pipeline (CI → build → deploy → Sentry → GH Release). Deploy идёт в drevo-release.
4. **Guard-test**: запустить workflow_dispatch с ветки, отличной от main (в UI выбрать любую feature-ветку) — должно упасть с ошибкой «only allowed from main».
5. **Backup-path**: вручную поставить `git tag vX.Y.Z+1 && git push origin vX.Y.Z+1` — pipeline должен отработать идентично (без compute-version job'а, сразу в release).

#### Checkpoint

- `cd-main-release.yml` содержит оба триггера (`push: tags` + `workflow_dispatch`).
- Dry run через workflow_dispatch отработал без создания тэга.
- Реальный запуск через workflow_dispatch создал тэг, запустил CI + deploy, опубликовал GH Release.
- Backup-путь (ручной `git tag`) тоже работает — проверен хотя бы одним контрольным релизом.
- `CLAUDE.md` / `README-deployment.md` отражает новый primary-путь выпуска релиза.

#### Rollback

Тривиальный: revert merge commit с правками `cd-main-release.yml` → workflow возвращается к Phase 9 конфигурации (только `push: tags`). Все существующие релизы, которые были сделаны через workflow_dispatch, остаются валидными (тэги уже в git).

Если дело дошло до удаления некорректно созданного тэга:
```bash
# Локально
git tag -d vX.Y.Z
# На remote
git push --delete origin vX.Y.Z
# GitHub Release (если был создан)
gh release delete vX.Y.Z --cleanup-tag
```

#### Known limitations и будущие улучшения

1. **Changelog всё ещё автогенерируется через `generate_release_notes: true` GitHub API** — это приемлемо, но не идеально. Следующий шаг — подключить `conventional-changelog` для структурированного changelog по секциям (Features/Fixes/BREAKING). Требует дисциплины Conventional Commits.
2. **Авто-обнаружение breaking change** (и принудительный major bump) невозможно без Conventional Commits. Пока человек сам решает, `minor` это или `major`.
3. **Version file sync** — если в проекте появится `package.json` с версией или `VERSION` файл, workflow должен будет их коммитить перед созданием тэга. Сейчас версия живёт только в git-тэгах, что проще.
4. **Release Please как следующий шаг** — когда commit-дисциплина Conventional Commits войдёт в привычку, логично перейти с auto-bump через input на полностью автоматический bump из коммит-сообщений. Это отдельный, независимый рефакторинг.

#### Когда НЕ делать Phase 12

- Если за 3+ месяца после Phase 11 не было ни одного случая ошибки с версионированием (не то что поставил, не то что забыл push, не то что тэгнул не тот commit) — возможно, ручные тэги достаточны для твоего workflow'а. Не чините то, что не сломано.
- Если планируется переход на Release Please/semantic-release в ближайшие 1–2 месяца — тогда Phase 12 станет лишним шагом в сторону; лучше сразу делать Release Please.

---

## 6. Risk register

| Риск | Вероятность | Воздействие | Митигация |
|---|---|---|---|
| Фаза 5→7 затягивается, beta долго не обновляется | Средняя | Среднее | Выполнять 5, 6, 7 одним сосредоточенным сеансом. Phase 6 предполагает готовые шаблоны файлов; заранее подготовить их в черновике. |
| Downtime при rename drevo-standalone → drevo-beta | Высокая (плановая) | Низкое (секунды) | Выполнять в low-traffic окно. Тест на staging невозможен — делаем сразу на сервере. |
| Workflow upload Sentry падает (missing secrets) | Средняя | Низкое (не блокирует deploy) | Шаг Sentry в workflow'ах имеет graceful fallback (предупреждение вместо ошибки) — наследовано из `standalone.yml`. |
| Случайно удалить drevo-staging/production вместе со standalone | Низкая | Высокое | Никогда не вызывать `pm2 delete` без явного имени. В Phase 2 — только drevo-standalone. Проверять `pm2 list` до и после. |
| Забыть обновить `ecosystem.config.js` на iframe → при hotfix-деплое iframe затрёт на сервере конфиг с beta/release | Средняя | Высокое | Phase 6 явно включает синхронизацию полного ecosystem.config.js на iframe. Проверять перед первым hotfix-деплоем. |
| Git fast-forward main → standalone не проходит (кто-то успел пушнуть в main) | Низкая | Низкое | До Phase 7 запустить `git fetch origin && git log origin/main..origin/standalone` — убедиться что main не двигался с `61cc2a9`. |
| Branch protection на main мешает push'у после Phase 7 | Средняя | Низкое | Настроить protection с `required_status_checks` только после первого успешного deploy в beta (Phase 8). Или временно разрешить admin bypass. |
| GH Environment `beta` не создан к моменту merge Phase 5 PR | Средняя | Низкое (job падает на старте) | Phase 4 сделать до Phase 5. Проверить перед merge Phase 5, что `beta` и `release` environments существуют. |
| Неверный порт в nginx (drevo-release недоступен снаружи) | Низкая | Среднее | Тест сразу после Phase 2: `curl -I https://<release-url>/` — должен отдать 200/302 (даже на «заглушечном» билде). |
| Случайный коммит с секретом в ветку без security-scan | Очень низкая | Высокое | После Phase 5/6 gitleaks настроен на `push: ['**']` — покрывает все ветки. Проверить, что файл приехал и в main, и в iframe. |
| (Phase 12) Version-bump на основе `git describe` ошибается, если кто-то удалил latest тэг | Очень низкая | Низкое | Phase 12 compute-version job валидирует, что рассчитанный тэг ещё не существует. Если удалён старый тэг — восстановить `git push origin refs/tags/vX.Y.Z`. |
| (Phase 12) Одновременный запуск двух workflow_dispatch создаёт два тэга подряд | Низкая | Среднее | В Phase 12 workflow задан `concurrency: release` с `cancel-in-progress: false` — второй запуск ждёт завершения первого. |
| (Phase 12) Check-run guard «CI зелёный» падает на коммитах, где `ci` job назван иначе | Низкая | Низкое | После первого запуска проверить реальное имя check-run через `gh api .../check-runs` и скорректировать jq-фильтр. |

## 7. Post-migration operational notes

### Hotfix iframe

Если понадобится внести правку в iframe (маловероятно, но возможно):

1. `git checkout iframe && git pull`
2. Создать feature-ветку от iframe, внести правку.
3. Открыть PR → iframe. `ci-iframe.yml` отработает автоматически.
4. Merge в iframe.
5. В GitHub Actions вручную запустить `cd-iframe-staging.yml` → выбрать `iframe` branch → проверить.
6. Если нужен релиз: `git tag iframe-v0.0.19 && git push origin iframe-v0.0.19`. Затем в Actions вручную запустить `cd-iframe-release.yml` с input `tag: iframe-v0.0.19`.

### Release workflow на main

1. `git checkout main && git pull`
2. `git tag -a vX.Y.Z -m "Release X.Y.Z"`
3. `git push origin vX.Y.Z`
4. `cd-main-release.yml` запустится автоматически: CI → build → deploy в drevo-release → GitHub Release → Sentry.

### Как проверить состояние серверных приложений

```bash
ssh github-deploy@<host>
pm2 list
pm2 show drevo-beta    # должен быть online, uptime бодрый
pm2 show drevo-release
pm2 logs drevo-beta --lines 50
ls -la ~/releases/beta-current ~/releases/release-current
readlink ~/releases/beta-current
```

### Мониторинг после миграции (первые 2 недели)

- Каждый деплой beta — проверить date-версию в footer приложения.
- Первый release — проверить, что Sentry корректно размечает ошибки source map'ами.
- Проверить, что iframe URL (`drevo-staging`, `drevo-production`) всё ещё работают — они не должны были измениться.
- В еженедельном review: убедиться, что `pm2 list` показывает все четыре приложения в статусе `online`.

## 8. Appendix: command cheat sheet

```bash
# Phase 0 — safety tags
git fetch --all --prune
git tag pre-migration-main-$(date +%Y%m%d) origin/main
git tag pre-migration-standalone-$(date +%Y%m%d) origin/standalone
git push origin 'refs/tags/pre-migration-*'

# Phase 7 — git flip
git checkout main
git merge --ff-only origin/standalone
git push origin main
# GH Settings → Default branch → main
git push --delete origin standalone
git branch -D standalone
git remote set-head origin -a

# Phase 10 — cleanup safety tags (после недели-двух успешной работы)
git push --delete origin pre-migration-main-YYYYMMDD pre-migration-standalone-YYYYMMDD
git tag -d pre-migration-main-YYYYMMDD pre-migration-standalone-YYYYMMDD
```

```bash
# Server-side Phase 2 (rename drevo-standalone → drevo-beta)
ssh github-deploy@<host>
pm2 save
cp ~/.pm2/dump.pm2 ~/.pm2/dump.pm2.pre-migration
STANDALONE_CURRENT=$(readlink ~/releases/standalone-current)
CURRENT_VERSION=$(basename "$STANDALONE_CURRENT")
mkdir -p ~/releases/beta ~/releases/release
cp -rP ~/releases/standalone/"$CURRENT_VERSION" ~/releases/beta/"$CURRENT_VERSION"
cp -rP ~/releases/standalone/"$CURRENT_VERSION" ~/releases/release/"$CURRENT_VERSION"
ln -sfn ~/releases/beta/"$CURRENT_VERSION" ~/releases/beta-current
ln -sfn ~/releases/release/"$CURRENT_VERSION" ~/releases/release-current
pm2 stop drevo-standalone && pm2 delete drevo-standalone
pm2 start ~/ecosystem.config.js --only drevo-beta
pm2 start ~/ecosystem.config.js --only drevo-release
pm2 save
pm2 list
curl -sS http://localhost:4010 | head -5
curl -sS http://localhost:4011 | head -5
# + nginx: добавить release server-блок, reload
```
