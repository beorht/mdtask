# Адаптивная вёрстка

Страницу открывают на телефоне (360–430px), планшете (768px+) и компьютере (1200px+). **Адаптивная** вёрстка — одна
разметка, которая хорошо выглядит на любой ширине.

## Шаг 0. viewport

Без этой строки телефон рисует страницу «как на компьютере» (шириной ~980px) и уменьшает — всё мелкое:

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

## Резиновое по умолчанию

- контейнер: `max-width: 960px; margin: 0 auto; padding: 0 16px;` — на широком экране не растягивается, на узком
  получает поля;
- картинки: `img { max-width: 100%; height: auto; }` — никогда не вылезают за родителя;
- размер шрифта, который сам растёт с экраном: `font-size: clamp(24px, 5vw, 48px)` — не меньше 24px, не больше 48px,
  между ними — 5% ширины окна;
- flex с переносом и grid с `auto-fit` + `minmax()` перестраиваются вообще без медиазапросов (тема 13).

## Медиазапросы: @media

Правила внутри `@media` действуют только при условии:

```css
.cols { display: flex; gap: 16px; }

@media (max-width: 600px) {          /* экран не шире 600px */
  .cols { flex-direction: column; }  /* колонки — одна под другой */
}
```

| Условие | Когда |
| --- | --- |
| `(max-width: 600px)` | ширина **до** 600px включительно |
| `(min-width: 768px)` | ширина **от** 768px |
| `(min-width: 768px) and (max-width: 1099px)` | диапазон |
| `(orientation: landscape)` | горизонтальный экран |
| `(prefers-color-scheme: dark)` | у человека тёмная тема |

Ширины, на которых раскладка меняется, называют **точками перелома** (breakpoints). Частые: 600, 768, 1024, 1200px —
но лучше выбирать там, где **ваша** вёрстка начинает ломаться.

```example Колонки складываются на узком экране (меняйте ширину окна браузера)
.cols { display: flex; gap: 8px; }
.cols div { flex: 1; background: #FFB173; padding: 10px; }
@media (max-width: 500px) { .cols { flex-direction: column; } }
---
<div class="cols"><div>Первая</div><div>Вторая</div><div>Третья</div></div>
```

## «Сначала телефон» (mobile first)

Базовые стили пишут **для узкого экрана**, а для широких добавляют `min-width`:

```css
.cards { display: grid; gap: 12px; }                 /* телефон: одна колонка */
@media (min-width: 768px)  { .cards { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1100px) { .cards { grid-template-columns: repeat(4, 1fr); } }
```

Так проще: на телефоне меньше всего места и меньше всего стилей, а дальше их только добавляют.

```example Сначала одна колонка, на широком экране — три (меняйте ширину окна браузера)
.grid { display: grid; gap: 8px; }
.grid div { background: #DDE8F5; padding: 10px; }
.title { font-size: clamp(18px, 4vw, 32px); }
@media (min-width: 640px) { .grid { grid-template-columns: repeat(3, 1fr); } }
---
<p class="title">Заголовок растёт вместе с окном</p>
<div class="grid"><div>Карточка</div><div>Карточка</div><div>Карточка</div></div>
```

## Меню-«бургер» без JavaScript

Флажок, спрятанный от глаз, и подпись к нему — кнопка «☰ Меню». `:checked` и комбинатор `~` показывают меню:

```css
.nav-toggle { display: none; }
.menu { display: none; }
.nav-toggle:checked ~ .menu { display: flex; flex-direction: column; }

@media (min-width: 768px) {
  .burger { display: none; }
  .header .menu { display: flex; flex-direction: row; }
}
```

## Таблицы на телефоне

Широкую таблицу оборачивают в блок с прокруткой: `.table-wrap { overflow-x: auto; }` — страница не «разъезжается»,
листается только таблица.

В практической работе над окнами вида есть переключатель «Телефон · Планшет · Компьютер» — проверка идёт на всех
трёх ширинах.
