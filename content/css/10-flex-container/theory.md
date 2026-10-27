# Flexbox: контейнер

**Flexbox** — способ раскладывать элементы **в ряд или в колонку** и выравнивать их. Пишется у **родителя**:

```css
.menu { display: flex; }
```

Родитель становится **flex-контейнером**, его дети — **flex-элементами**: они встают в ряд, даже если были
блочными.

## Две оси

```text
            главная ось (flex-direction: row) →
          ┌──────────┬──────────┬──────────┐
поперечная│ элемент 1│ элемент 2│ элемент 3│
ось     ↓ └──────────┴──────────┴──────────┘
```

- **главная ось** — направление ряда, задаётся `flex-direction`: `row` (слева направо, по умолчанию), `row-reverse`,
  `column` (сверху вниз), `column-reverse`;
- **поперечная** — перпендикулярно ей.

| Свойство контейнера | Выравнивает | Значения |
| --- | --- | --- |
| `justify-content` | по **главной** оси | `flex-start`, `center`, `flex-end`, `space-between`, `space-around`, `space-evenly` |
| `align-items` | по **поперечной** оси | `stretch` (по умолчанию), `flex-start`, `center`, `flex-end`, `baseline` |
| `flex-wrap` | перенос | `nowrap` (по умолчанию — всё в одну строку), `wrap` |
| `gap` | промежуток между элементами | `16px` или `row-gap` / `column-gap` отдельно |
| `align-content` | строки при переносе | как у `justify-content` |

```example Ряд, промежуток, распределение
.row { display: flex; gap: 8px; background: #F4F1EC; padding: 8px; margin-bottom: 8px; }
.row div { background: #FF6766; color: white; padding: 8px 14px; }
.between { justify-content: space-between; }
.center { justify-content: center; }
---
<div class="row"><div>1</div><div>2</div><div>3</div></div>
<div class="row between"><div>1</div><div>2</div><div>3</div></div>
<div class="row center"><div>1</div><div>2</div><div>3</div></div>
```

## Центр по обеим осям

Задача, ради которой flexbox любят больше всего:

```example По центру — три строки
.screen { display: flex; justify-content: center; align-items: center; height: 160px; background: #1F3F66; }
.box { background: #FFE3B3; padding: 16px 24px; }
---
<div class="screen"><div class="box">Ровно по центру</div></div>
```

## Колонка и перенос

```example flex-direction: column и flex-wrap: wrap
.col { display: flex; flex-direction: column; gap: 6px; width: 160px; margin-bottom: 12px; }
.wrap { display: flex; flex-wrap: wrap; gap: 8px; width: 330px; }
.col div, .wrap div { background: #FFB173; padding: 8px; }
.wrap div { width: 90px; }
---
<div class="col"><div>сверху</div><div>вниз</div><div>колонкой</div></div>
<div class="wrap"><div>1</div><div>2</div><div>3</div><div>4</div><div>5</div></div>
```

## space-between, space-around, space-evenly

```text
space-between:  |▇▇      ▇▇      ▇▇|   крайние — у краёв
space-around:   | ▇▇    ▇▇    ▇▇  |   у краёв — половина промежутка
space-evenly:   |  ▇▇   ▇▇   ▇▇   |   все промежутки равны
```

## align-items: stretch

По умолчанию элементы **растягиваются** по поперечной оси на всю высоту контейнера. Если нужна их собственная
высота — `align-items: flex-start` (или `center`).
