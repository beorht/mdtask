# Блочная модель

Каждый элемент на странице — **прямоугольная коробка** из четырёх слоёв:

```text
┌──────────── margin (внешний отступ, прозрачный) ────────────┐
│  ┌───────── border (рамка) ────────────────────────────┐    │
│  │  ┌────── padding (внутренний отступ, цвет фона) ─┐   │    │
│  │  │        content (содержимое: width × height)   │   │    │
│  │  └───────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

```example Слои коробки
.box {
  width: 200px;
  padding: 20px;
  border: 6px solid #CA2851;
  margin: 24px;
  background: #FFE3B3;
}
---
<div class="box">content 200px</div>
```

## Запись отступов

| Запись | Значит |
| --- | --- |
| `padding: 10px` | со всех сторон |
| `padding: 10px 20px` | сверху и снизу 10, слева и справа 20 |
| `padding: 5px 10px 15px` | сверху 5, бока 10, снизу 15 |
| `padding: 5px 10px 15px 20px` | по часовой стрелке: верх, право, низ, лево |
| `margin-top`, `padding-left` … | одна сторона |

Рамка: `border: 2px solid #333` (толщина, стиль, цвет). Стили: `solid`, `dashed`, `dotted`, `double`, `none`.
Одна сторона — `border-bottom: …`.

## Ширина: content-box и border-box

По умолчанию `width` — ширина **только содержимого**, а padding и border прибавляются сверху: блок `width: 200px`
с `padding: 20px` и рамкой 6px займёт 252px. С `box-sizing: border-box` ширина **включает** padding и рамку — так
считать проще, поэтому на сайтах часто пишут:

```css
*, *::before, *::after { box-sizing: border-box; }
```

```example content-box и border-box
.a, .b { width: 200px; padding: 20px; border: 5px solid #1F3F66; margin-bottom: 8px; background: #DDE8F5; }
.b { box-sizing: border-box; }
---
<div class="a">content-box: 250px</div>
<div class="b">border-box: 200px</div>
```

## Центрирование и ограничение ширины

- `margin: 0 auto` у блока с заданной шириной ставит его **по центру** родителя;
- `max-width: 640px` — не шире 640px, но на узком экране сжимается; `min-height: 200px` — не ниже 200px.

```example Колонка текста по центру
.column { max-width: 320px; margin: 0 auto; padding: 16px; background: #FFF3E6; }
---
<div class="column">Колонка не шире 320px и стоит по центру.</div>
```

## Схлопывание отступов

Вертикальные `margin` двух соседних блоков **не складываются**: между `margin-bottom: 20px` и `margin-top: 30px`
будет 30px — побеждает больший. У `padding` такого нет.
