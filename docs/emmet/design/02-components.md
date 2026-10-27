# 2. Компоненты

Значения взяты из `src/styles/main.css` и `src/admin/admin.css`. Токены описаны в [01-foundations.md](01-foundations.md).

## Бренд

```html
<div class="brand">
  <span class="brand-mark">&lt;/&gt;</span>
  <span class="brand-name">Emmet</span>
  <span class="brand-sub">тетрадь</span>
</div>
```

- `brand-mark`: JetBrains Mono 500 12px, цвет `--accent-cream` на `--ink`, padding 3×7, радиус 7.
- `brand-name`: Oswald 500 22px, uppercase, `.1em`, `--ink`.
- `brand-sub`: 11px 500, uppercase, `.24em`, `--text-muted`. В панели преподавателя текст «панель преподавателя».
- Выравнивание по базовой линии, зазор 10px.

## Кнопки

| Класс | Вид | Размер |
| --- | --- | --- |
| `.btn` | База: inline-flex, gap 6, 13px 600, nowrap, рамка 1px transparent, радиус 10, переход 160ms | h 36, px 14, иконка 16 |
| `.btn-primary` | Текст `--bg` на `--ink`; hover `#2B2926` | |
| `.btn-ghost` | Прозрачная, рамка `--border`; hover `--accent-cream` | |
| `.btn-danger` | Текст и рамка `--status-error`; hover — заливка error, текст `--bg` | |
| `.btn-link` | Без фона, `--wood-text`, подчёркивание с отступом 3px | авто |
| `.icon-btn` | Квадрат, рамка `--border`, `--text-secondary`; hover `--accent-cream` + `--ink` | 32×32, радиус 10 |
| `:disabled` | opacity .45 (icon-btn .4), cursor default | |

## Панель

```css
.panel { background: var(--bg); border: 1px solid var(--border); border-radius: 18px; overflow: hidden; }
.panel-head { padding: 14px var(--pad) 0; display: flex; justify-content: space-between; gap: 8px 12px; }
```

Заголовок панели — двухстрочный: `.eyebrow` («ОБРАЗЕЦ», «ПРАКТИЧЕСКАЯ РАБОТА · 3 / 20») и `.panel-title` (Oswald 20).

## Внутреннее окно (`.target-pane`)

- `--surface`, рамка `--border`, радиус 12, `overflow: hidden`, flex-колонка.
- `figcaption`: min-h 31, padding 4×8×4×12, 10px 600 uppercase `.14em` muted, нижняя граница. Справа может стоять `.pane-note` (10px 500, обычный регистр, muted).
- Акцентное окно «Как должно выглядеть» (`.render-target`): рамка `--accent-sand`, подпись `--wood-text`.

## Сегментированный переключатель (`.view-switch`, `.section-tabs`)

- Контейнер: inline-flex, padding 3, фон `--accent-cream`, радиус 10.
- Вкладка: h 28 (в панели 30), px 12–14, 12–13px 600, `--text-secondary`, без фона, радиус 8.
- Активная (`aria-pressed=true`): `--ink` на `--surface`, тень `0 1px 3px rgb(59 56 53 / .15)`.

## Поле ввода ключа

- h 48, px 14, JetBrains Mono 500 20px `.08em`, `--ink` на `--surface`, рамка `--accent-sand`, радиус 12.
- Placeholder `--accent-sand`; фокус: рамка `--accent-wood`, outline-offset 0; ошибка (`aria-invalid=true`): рамка error.
- Над полем label (10.5 600 uppercase `--wood-text`), под ним строка ошибки 12.5 error высотой 20.

## Карточка входа и экран «Занятие окончено»

- Фон экрана — клетка 24px по `--page`, карточка по центру: ширина до 380, padding 28, `--bg`, радиус 18, тень входа, анимация `panel-rise`.
- Заголовок Oswald 26 (отступ сверху 26), текст 13 secondary, кнопка «Войти» primary h 44 на всю ширину.
- «Занятие окончено»: всё по центру, круг 56×56 с галочкой 28px: цвет success, фон `color-mix(success 14%)`.

## Редактор (`.editor-shell`)

- `--surface`, рамка `--border`, радиус 12, flex 1, min-h 120. `container-type: inline-size`.
- `:focus-within`: рамка `--accent-sand` + кольцо `0 0 0 3px rgb(201 183 156 / .25)`.
- Внутри CodeMirror: лист в клетку, строка 24px, отступ контента по вертикали 24, у строки 0 12 0 8. Курсор 2px `--ink`, активная строка `rgb(237 228 211 / .4)`, выделение `rgb(201 183 156 / .45)`, парная скобка `rgb(184 138 90 / .18)`.
- Ручной ввод (`.cm-handwritten`): фон `rgb(169 69 47 / .12)` + волнистое подчёркивание error с отступом 3px.
- Нижняя строка (`.editor-bar`, min-h 32, граница сверху): слева кнопка «👁 Результат» (10px uppercase, активная — `--wood-text`), справа подсказка по клавишам 11px muted с `<kbd>`.
- `kbd`: 10.5px/16, padding 0 5, `--surface`, рамка `--border` с нижней 2px, радиус 4.

## Обратная связь (`.feedback`)

```text
▌ Заголовок статуса                         Дальше →
▌ Сообщение. Дополнительно (muted)
```

- Сетка `3px | 1fr | auto`, gap 10, min-h 52, padding 7×12×7×8, радиус 10, фон `--tone-bg`.
- Полоса слева 3px цвета `--tone`; заголовок 13px 600 цвета `--tone` (у idle — `--text-primary`); сообщение 12.5/1.45 secondary.
- `data-status` задаёт пару `--tone/--tone-bg`: idle, success, partial, error, mismatch.
- При смене статуса проигрывается `settle` 280ms. Кнопка «Дальше →» (btn-link) видна только при success.

## Бейджи

- Уровень (`.task-level`): 10.5 600 uppercase `.08em`, `--wood-text` на `--accent-cream`, padding 1×9, радиус 999.
- Статус в панели (`.badge`): 11px 600, padding 2×9, радиус 999. solved/tried — пары статусов, opened/none — muted на surface с внутренней рамкой.
- «Пилюли» статистики в карточке студента: 12.5 secondary на `--accent-cream`, padding 6×12, радиус 999, значение `<b>` цвета `--ink` (error при нарушениях).

## Навигация по шагам

- Счётчик «N / 20» (или «Теория»): 13px 600 `.12em` muted, tabular-nums.
- Стрелки: icon-btn 40×40, радиус 12, иконка 20.
- Точка (`.lesson-dot`): кнопка 18×32, видимая часть — `::before` с inset 11×2, рамка 1.5 `--accent-sand`, радиус 5.
  - hover: фон cream; решена: фон sand; текущая: ширина 32, фон и рамка `--accent-wood` (переход ширины 260ms).
  - Теория (`.is-lesson`): круг (inset 9×1, 50%), рамка `#6AA57E`, решённая `#BFDCC8`, текущая `#2F7A4A`; слева отступ 8.
  - Контейнеры (`.is-containers`): рамка и заливка решённой `#8CC39E`, текущая `#2F7A4A`.

## Чип пользователя

- Слева разделитель (рамка `--border`, отступ 14). Точка статуса 8×8: success (сохраняется) или error (`.is-offline`). Имя 13px 600 с многоточием, до 220px. Кнопка выхода — icon-btn.

## Тост

- `position: fixed`, сверху 74px по центру, ширина по содержимому, до 520px. Padding 12×18, 13px/1.45, текст `--bg` на `--ink`, радиус 12, тень тоста, анимация `toast-in`. Скрывается через 6 с.

## Панель преподавателя

- **Карточка сводки (`.stat`):** `--bg`, рамка, радиус 18, padding 16×18. Ярлык (eyebrow), число Oswald 34 с `<small>` 18 muted, примечание 12.5 secondary. Сетка `auto-fit minmax(210px, 1fr)`.
- **Баннер завершения:** 13px error, фон `color-mix(error 8%, --bg)`, рамка `color-mix(error 35%)`, радиус 18.
- **Поиск и сортировка:** h 36, px 12, 13px, `--surface`, рамка, радиус 10; поиск шириной 220.
- **Матрица:** `border-spacing: 2px`, 12.5px tabular-nums. Шапка — 10.5 uppercase muted. Колонка работы: номер, сверху черта 3px сложности (1 — cream, 2 — sand, 3 — wood). Первая колонка (имя) липкая, 190px.
- **Ячейка (28px, радиус 7, 600):** solved — пара success и число попыток; tried — пара partial; opened — surface с внутренней рамкой sand 1.5; none — surface с внутренней рамкой border 1; unassigned — прозрачная с «·» цвета sand. Признак списывания — красный треугольник 9px в правом верхнем углу (`::after`).
- **Итоги работы:** ячейка «Решили» с фоном `rgb(85 116 63 / calc(var(--share) * .28))` — чем больше решили, тем насыщеннее.
- **Точка онлайн:** 7×7, рамка sand 1.5; онлайн — заливка success.
- **Диалог (`<dialog class="sheet">`):** ширина до 860 (ключи — 560), высота до `100dvh - 48`, `--bg`, рамка, радиус 18, тень диалога, `panel-rise` 420ms. Шапка: padding 20×22×12, Oswald 24. Подвал: верхняя граница, padding 14×22×18. Клик по подложке закрывает диалог.
- **Строка работы (`details.task-row`):** сетка `28 | 1fr | 112 | 64 | 92 | 56 | 72`. Hover и раскрытая строка — cream. Код внутри: `--surface`, рамка, радиус 12, до 260px с прокруткой.
- **Кнопка ключа:** моно 14px 500 `.1em`, `--surface`, рамка, радиус 8, cursor copy. Скопировано: success и « ✓».
- **Печать карточек:** 2 колонки, пунктир `#999`, padding 16×18. Сайт 10px `#555`, ФИО 14px 600, ключ моно 600 24px `.14em`.

## Теория

- Статья до 980px, padding 28×pad×40. Hero: eyebrow, заголовок Oswald 34, лид 15px до 640, нижняя граница.
- Раздел: padding-top 26. Заголовок Oswald 24 с номером: квадрат 32×32, радиус 9, 15px 600, `--bg` на `--ink`.
- Подзаголовок 15px 600 `--ink`, отступ сверху 22. Inline-код: padding 0 4, 12.5px, фон cream, радиус 4.
- Карточки (`.lesson-card`): сетка `auto-fit minmax(220px, 1fr)`, padding 14×16, радиус 12. Тона id, class, header, nav, main, footer — по цветам контейнеров.
- Пример: две колонки (код | «В браузере» со схемой); на ≤760px — в столбик. Код: `--surface`, радиус 12, 13/1.6. Фигура: `#FFFDF9`, рамка, радиус 12, подпись 10px uppercase.
- Таблица: 13px, ячейки 8×12 с рамкой, шапка на cream, `id` и `class` подсвечены синим и оранжевым.
- Совет: фон `#FBE3CC`, padding 12×16, радиус 12. Маркеры списков `--accent-wood`.
- Финальный блок «Как устроены задания»: `--surface`, рамка `--accent-sand`, радиус 18, padding 22×24×24, кнопка primary h 42.

## Превью кода (iframe)

| Вариант | Где | Стиль |
| --- | --- | --- |
| `plain` | Образец Emmet и «Результат» студента | padding 12×14, Montserrat-подобный system-ui 14/1.5, `#3D3A36` на `#FFFDF9`; у каждого тега пунктир `#D9CBB5` с отступом 2; пустой тег показывает `<tag>` моно 11px `#A8977E`; ссылки `#8A5F35`; img-заглушка 40×28 `#F3ECE1` |
| `clean` | «Браузер» в заданиях на контейнеры | Стили браузера по умолчанию, белый фон |
| `boxes` | «Схема» и примеры в теории | См. [03-boxes-schema.md](03-boxes-schema.md), фон `#FFFDF9`, padding 14; пусто — «Пока пусто» 13px `#A8977E` |

Во всех вариантах `user-select: none` (содержимое нельзя скопировать).
