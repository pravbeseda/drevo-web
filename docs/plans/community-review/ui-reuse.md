# План: переиспользование ui-lib в review-block

Разбор кастомного UI в `app-review-block`, который дублирует/обходит `@drevo-web/ui`.
Решения принимаем по одному (`/one`).

## Вопросы

### Q1: `review-ic` — цветной диск статус-иконки ✅
В шаблоне 3× обёртка `<span class="review-ic" [class]="cssClass"><ui-icon/></span>`,
в SCSS дубль цветового блока `success/warning/error/neutral` → `--themed-text-*`
(`review-block.component.scss:121-140`). Раскраска иконки — забота ui-lib.

**Решение:** Вариант A — добавить в `ui-icon` вход `tone`. Уточнение по naming: `tone`
делаем **опциональным без дефолта** (`tone = input<IconTone>()`), без литерала `inherit`.
`undefined` ⇒ host-класс цвета не вешается ⇒ иконка наследует ambient `color` (текущее
поведение, обратная совместимость). Дефолт `neutral` отвергнут — покрасил бы все
существующие иконки в серый. `IconTone = 'success'|'warning'|'error'|'neutral'|'primary'|'secondary'`.
В review-block убираем обёртку `.review-ic` (3×) и цветовой блок SCSS, передаём
`[tone]="item.cssClass"`.

### Q2: радио-пилюли формы голосования ✅
Самописный segmented single-select: скрытый `<input type=radio>` + `.review-pill`
(`html:88-113`, `scss:142-189`). Аналога в ui нет; Material даёт `mat-button-toggle-group`.

**Решение:** Вариант A — новый `ui-button-toggle-group` (обёртка над
`mat-button-toggle-group`) в `libs/ui`: CVA, single-select, опции через `ui-button-toggle`
(контент-проекция) или input-массив; a11y/состояние/навигация стрелками от Material.
В форме голосования заменяем скрытые радио + `.review-pill` на этот контрол; цвет/иконку
статуса прокидываем (в т.ч. `tone` из Q1). Тесты компонента в libs/ui. Принято осознанно,
несмотря на единственного потребителя: это generic form-control, а не доменный код, и
правило «Material только через ui» требует обёртки.

### Q3: кнопка «Удалить» ✅
Сырой `<button class="review-cmt-del">` под текст-ссылку (`html:51-58`, `scss:99-112`)
вместо `ui-button`.

**Решение:** Вариант B — `ui-icon-button icon="delete"` с tooltip/aria «Удалить отзыв».
Иконка-корзина вместо слова: убирает весь `.review-cmt-del` CSS, tooltip/aria встроены,
не утяжеляет компактную шапку комментария (в отличие от полноразмерного text-button).
Слово «Удалить» уходит из шапки (остаётся в подтверждающем диалоге).

### Q4: карточка-обёртка `review-block` ✅
Бордер/радиус/`--themed-secondary-bg` руками (`scss:5-11`) ~ `ui-banner`, но с хедером
и разделителем, которых у banner нет.

**Решение:** Вариант A — оставить кастомную карточку. Переиспользования по сути нет:
совпадает только «коробка», а структура (титульный хедер + full-bleed разделитель +
раздельные паддинги) — другой паттерн. B (завернуть в banner) хрупок — драка с паддингом
banner ради разделителя; C (расширять banner слотом) — преждевременное обобщение под
1 потребителя.

**Доп. (принято):** вынести магическую `border-radius: 10px` в общий токен `_tokens.scss`
(сейчас radius-токенов только два, оба `8px`). Применить и в `.review-block`, и в
`ui-banner` (там тот же `10px`) — убрать дрейф. Имя токена — на этапе реализации
(напр. `$card-border-radius` / `$panel-border-radius`).
