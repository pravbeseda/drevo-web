# Phase 12 (OPTIONAL) — Upgrade release trigger: `workflow_dispatch` + auto-bump

**Статус**: **необязательная**. Не блокирует миграцию. Выполнять через 2–4 недели после завершения Phase 11 — после того как новый pipeline стабилизируется и будет сделано 1–3 успешных релиза через обычный `git tag`.

**Goal**: заменить/дополнить триггер `cd-main-release.yml` с «push tag `[0-9]*`» на ручной `workflow_dispatch` с автоматическим semver-bump. Устранить класс ошибок «поставил тэг не на ту версию / не на тот коммит / забыл запушить».

## Motivation

Текущий подход (Phase 9: `git tag X.Y.Z && git push origin X.Y.Z`) имеет три слабости, которые реально выстреливают в solo-dev сценарии:

1. **Версию выбирает человек по памяти.** Через месяц между релизами легко забыть, какая была предыдущая, и поставить `0.2.0` вместо `0.1.1` (или наоборот).
2. **Тэг можно поставить на любой коммит**, включая WIP-ветку или красный main. Никакой валидации. Один неаккуратный `git tag 1.0.0 HEAD~5 && git push origin 1.0.0` — и в прод уехал билд пятидневной давности.
3. **Легко забыть push.** `git tag X.Y.Z` без `git push origin X.Y.Z` = тишина, релиза нет, но локально «кажется, что он есть».

`workflow_dispatch` с auto-bump закрывает все три:

- Версия вычисляется автоматически из последнего тэга + `bump_type` (patch/minor/major), ввод руками не нужен.
- Workflow валидирует, что запущен на `main` и что HEAD зелёный перед созданием тэга.
- Тэг создаётся **внутри** CI, запустив `git push` нативно от GitHub Actions — «забыть push» невозможно.
- Environment `release` уже имеет `required reviewers = self` (из Phase 4) → дополнительный click-to-confirm через GH UI.
- Аудит-лог в Actions: кто когда какую версию выпустил, на каком SHA — всё видно.

## Non-goals

- **Не переходим на Release Please / semantic-release.** Это следующий шаг, но требует дисциплины Conventional Commits — вернёмся к этому через 3–6 месяцев, когда новый main устаканится.
- **Не удаляем триггер на `push tags: ['[0-9]*']`.** Оставляем оба триггера параллельно: новый (`workflow_dispatch`) — основной, старый (`tags`) — backup на случай, если workflow_dispatch по какой-то причине недоступен или нужно вручную запустить релиз из коммита с уже существующим тэгом.

## Design

**Вариант реализации**: один workflow `cd-main-release.yml` с двумя триггерами и compute-version job.

```yaml
name: CD Main Release

on:
    push:
        tags: ['[0-9]*']                # backup: ручной git tag всё ещё работает
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
                  latest=$(git describe --tags --abbrev=0 --match '[0-9]*' 2>/dev/null || echo "0.0.0")
                  current="$latest"
                  IFS='.' read -r major minor patch <<< "$current"
                  case "${{ inputs.bump_type }}" in
                      major) major=$((major+1)); minor=0; patch=0 ;;
                      minor) minor=$((minor+1)); patch=0 ;;
                      patch) patch=$((patch+1)) ;;
                  esac
                  new_version="${major}.${minor}.${patch}"

                  # Sanity: тэг ещё не существует
                  if git rev-parse "$new_version" >/dev/null 2>&1; then
                      echo "::error::Tag $new_version already exists"
                      exit 1
                  fi

                  echo "version=$new_version" >> "$GITHUB_OUTPUT"
                  echo "tag=$new_version" >> "$GITHUB_OUTPUT"
                  echo "Latest: $latest → next (${{ inputs.bump_type }}): $new_version"

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
        # 1) push тэга [0-9]* (классический путь — остался как backup)
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
                      echo "version=${GITHUB_REF_NAME}" >> "$GITHUB_OUTPUT"
                      echo "tag=${GITHUB_REF_NAME}" >> "$GITHUB_OUTPUT"
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

## Key features

1. **`concurrency: release`** — только один релиз одновременно. Защищает от двух параллельных workflow_dispatch.
2. **Guard на main** — нельзя запустить workflow_dispatch с другой ветки (в UI это возможно, но workflow откажется).
3. **Guard на зелёный CI** — проверяет через `gh api`, что check-run `ci` на HEAD main успешен. Если красный — отказ.
4. **Dry run** — input `dry_run: true` позволяет увидеть, какая версия была бы создана, без реального создания тэга. Полезно для sanity-check перед первым «настоящим» запуском.
5. **Двойной триггер** — push тэга оставлен как fallback. Если вдруг захочется руками поставить тэг или любой другой edge case — старый путь работает.
6. **`compute-version` и `release` — разные jobs** — чтобы логика bump'а была изолирована и легко тестировалась отдельно от тяжёлого deploy-job'а.

## Branch

`refactor/release-workflow-dispatch` от main.

## Changes

1. **`.github/workflows/cd-main-release.yml`** — обновить по схеме выше.
2. **`docs/plans/branch-migration/plan.md`** — отметить Phase 12 как завершённую (после успешного smoke-test).
3. **`CLAUDE.md`** или **`README-deployment.md`** — обновить раздел «Release workflow»:
    ```markdown
    ## Release workflow

    **Primary (recommended):** GitHub Actions → `CD Main Release` → Run workflow → select `main` → choose bump type (patch/minor/major) → Run.

    **Backup:** manual `git tag -a X.Y.Z -m "..." && git push origin X.Y.Z` — also works, pipeline identical.
    ```

## Validation plan

1. **Dry run** через workflow_dispatch с `bump_type: patch, dry_run: true`. Ожидаемое: job `compute-version` печатает «next version = N.M.(P+1)», job `release` не запускается. Нет нового тэга.
2. **Dry run с `bump_type: minor`** — проверить, что patch сбрасывается в 0.
3. **Реальный запуск** с `bump_type: patch, dry_run: false` — создаётся настоящий тэг, отрабатывает full pipeline (CI → build → deploy → Sentry → GH Release). Deploy идёт в drevo-release.
4. **Guard-test**: запустить workflow_dispatch с ветки, отличной от main (в UI выбрать любую feature-ветку) — должно упасть с ошибкой «only allowed from main».
5. **Backup-path**: вручную поставить `git tag X.Y.Z+1 && git push origin X.Y.Z+1` — pipeline должен отработать идентично (без compute-version job'а, сразу в release).

## Checkpoint

- `cd-main-release.yml` содержит оба триггера (`push: tags` + `workflow_dispatch`).
- Dry run через workflow_dispatch отработал без создания тэга.
- Реальный запуск через workflow_dispatch создал тэг, запустил CI + deploy, опубликовал GH Release.
- Backup-путь (ручной `git tag`) тоже работает — проверен хотя бы одним контрольным релизом.
- `CLAUDE.md` / `README-deployment.md` отражает новый primary-путь выпуска релиза.

## Rollback

Тривиальный: revert merge commit с правками `cd-main-release.yml` → workflow возвращается к Phase 9 конфигурации (только `push: tags`). Все существующие релизы, которые были сделаны через workflow_dispatch, остаются валидными (тэги уже в git).

Если дело дошло до удаления некорректно созданного тэга:
```bash
# Локально
git tag -d X.Y.Z
# На remote
git push --delete origin X.Y.Z
# GitHub Release (если был создан)
gh release delete X.Y.Z --cleanup-tag
```

## Known limitations и будущие улучшения

1. **Changelog всё ещё автогенерируется через `generate_release_notes: true` GitHub API** — это приемлемо, но не идеально. Следующий шаг — подключить `conventional-changelog` для структурированного changelog по секциям (Features/Fixes/BREAKING). Требует дисциплины Conventional Commits.
2. **Авто-обнаружение breaking change** (и принудительный major bump) невозможно без Conventional Commits. Пока человек сам решает, `minor` это или `major`.
3. **Version file sync** — если в проекте появится `package.json` с версией или `VERSION` файл, workflow должен будет их коммитить перед созданием тэга. Сейчас версия живёт только в git-тэгах, что проще.
4. **Release Please как следующий шаг** — когда commit-дисциплина Conventional Commits войдёт в привычку, логично перейти с auto-bump через input на полностью автоматический bump из коммит-сообщений. Это отдельный, независимый рефакторинг.

## Когда НЕ делать Phase 12

- Если за 3+ месяца после Phase 11 не было ни одного случая ошибки с версионированием (не то что поставил, не то что забыл push, не то что тэгнул не тот commit) — возможно, ручные тэги достаточны для твоего workflow'а. Не чините то, что не сломано.
- Если планируется переход на Release Please/semantic-release в ближайшие 1–2 месяца — тогда Phase 12 станет лишним шагом в сторону; лучше сразу делать Release Please.
