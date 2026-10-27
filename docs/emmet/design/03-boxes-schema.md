# 3. Схема коробок

Визуальный язык из презентации «HTML id, class и контейнеры». Каждый контейнер нарисован цветной
коробкой с подписью `tag#id.class`, у остальных элементов рядом стоит маленькая метка тега.
Используется в теории (прямо в странице) и в варианте превью «Схема» (внутри iframe).

```text
┌ header ─────────────────────────────── (синяя, сплошная) ┐
│ Мой блог                                                  │
│ ┌ nav ─ Главная  Статьи ───────── (оранжевая, в строку) ┐ │
│ └───────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
┌ main ───────────────────────────────── (зелёная, сплошная) ┐
│ Новая статья                                               │
│ ┌ div.card ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ (пунктир) ┐              │
│ │ Плов  [h2]   Текст  [p]                    │              │
│ └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘              │
└────────────────────────────────────────────────────────────┘
┌ footer ─────────────────────────── (фиолетовая, сплошная) ┐
│ 2026 Мой блог                                              │
└────────────────────────────────────────────────────────────┘
```

## Как это работает

1. `sanitize(html)` (`src/components/PreviewFrame.js`) проставляет каждому элементу:
   - `data-label` = `tag` + `#id` (первый) + `.class` для каждого класса;
   - `data-kind` = `id | class | tag` — только для **не**-контейнеров.
2. Контейнеры: `div, header, nav, main, footer, section, article, aside`.
3. CSS-правила (`src/styles/boxes.css`) действуют внутри `.boxes` и выводят подписи через `::before` и `::after` с `content: attr(...)`.

## Правила

```css
.boxes {
  --box-line: #6AA57E;  --box-fill: rgb(255 255 255 / .55);
  --box-ink:  #2F7A4A;  --label-bg: #DEEEE2;
  font: 14px/1.45 'Montserrat', system-ui, sans-serif;  color: #1F2933;
}
/* коробка */
.boxes :is(div,header,nav,main,footer,section,article,aside) {
  position: relative; margin: 8px 0; padding: 30px 12px 10px;
  background: var(--box-fill); border: 1.5px dashed var(--box-line); border-radius: 10px;
}
/* подпись коробки */
…::before {
  content: attr(data-label); position: absolute; top: 7px; left: 10px; padding: 1px 7px;
  font: 600 11px/1.4 'JetBrains Mono', monospace; color: var(--box-ink);
  background: var(--label-bg); border-radius: 6px;
}
```

| Контейнер | `--box-line` | `--box-fill` | `--box-ink` | Рамка |
| --- | --- | --- | --- | --- |
| div и прочие | `#6AA57E` | `rgb(255 255 255 / .55)` | `#2F7A4A` (метка на `#DEEEE2`) | 1.5px пунктир |
| header | `#8BAEE0` | `#DCE7F7` | `#2F5FA7` | 1px сплошная |
| nav | `#E5A56B` | `#FBE3CC` | `#A0571B` | 1px сплошная; flex в строку, gap 4×14, padding 8×12, подпись стоит первой (static) |
| main | `#8CC39E` | `#DEEEE2` | `#2F7A4A` | 1px сплошная |
| footer | `#A897D3` | `#E7E0F3` | `#6A4FA3` | 1px сплошная |

У цветных контейнеров фон метки `rgb(255 255 255 / .6)`. Пустой контейнер имеет минимальную высоту 40px (nav — 0).

## Метки элементов

```css
.boxes [data-kind]::after {
  content: attr(data-label); display: inline-block; margin-left: 8px; padding: 0 6px;
  font: 500 10.5px/1.6 'JetBrains Mono', monospace; vertical-align: .15em;
  color: #6B7480; background: #ECEAE6; border-radius: 5px;      /* просто тег */
}
.boxes [data-kind='class']::after { color: #A0571B; background: #FBE3CC; }  /* с class */
.boxes [data-kind='id']::after    { color: #2F5FA7; background: #DCE7F7; }  /* с id */
.boxes a[data-kind='tag']::after,
.boxes button[data-kind='tag']::after { content: none; }  /* у простых ссылок и кнопок без меток */
```

## Типографика внутри схемы

- h1 24/1.2, h2 19/1.25, h3 16; отступы 2×0×4.
- p `#3E4A56`, отступ 4×0; списки с отступом 20.
- Ссылки `#2F5FA7`, подчёркнутые (отступ 3px).
- Кнопки: 13px 600, padding 4×12, `#1F2933` на `#FFFDF9`, рамка `#C9C2B8`, радиус 8, отступ справа 6.

## Перенос

Файл `src/styles/boxes.css` самодостаточен: нужны только атрибуты `data-label` и `data-kind` у разметки
и класс `.boxes` у корня. Чтобы использовать схему в iframe, вставьте CSS строкой в `<style>`
(в Vite — через `import css from './boxes.css?raw'`) и повесьте `class="boxes"` на `<body>`.
