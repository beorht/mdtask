# Grid: сетка

Flexbox раскладывает элементы **по одной оси** (ряд или колонка). **Grid** — **двумерная сетка**: колонки и строки
сразу. Пишется у родителя:

```css
.gallery {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr; /* три колонки */
  gap: 12px;
}
```

Дети сами раскладываются по ячейкам слева направо, сверху вниз.

## Колонки и строки

| Запись | Значит |
| --- | --- |
| `grid-template-columns: 200px 1fr` | первая колонка 200px, вторая — всё остальное |
| `1fr 2fr` | свободное место делится 1 : 2 |
| `repeat(4, 1fr)` | четыре равные колонки |
| `grid-template-rows: 80px auto 60px` | высоты строк |
| `grid-auto-rows: 120px` | высота всех строк, которые появятся сами |
| `gap: 16px` / `row-gap`, `column-gap` | промежутки |

**`fr`** (fraction, доля) — единица свободного места в сетке: сначала вычитаются фиксированные колонки и промежутки,
остаток делится по долям.

```example Колонки 200px и 1fr, промежутки
.grid { display: grid; grid-template-columns: 120px 1fr 2fr; gap: 8px; }
.grid div { background: #FFB173; padding: 10px; }
---
<div class="grid"><div>120px</div><div>1fr</div><div>2fr</div><div>120px</div><div>1fr</div><div>2fr</div></div>
```

## Ячейка на несколько колонок и строк

Линии сетки нумеруются с 1. Элемент можно растянуть:

| Запись | Значит |
| --- | --- |
| `grid-column: span 2` | на две колонки |
| `grid-row: span 2` | на две строки |
| `grid-column: 1 / 3` | от линии 1 до линии 3 |
| `grid-column: 1 / -1` | от первой до последней линии — на всю ширину |

```example span и 1 / -1
.grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: 60px; gap: 8px; }
.grid div { background: #DDE8F5; padding: 8px; }
.grid .wide { grid-column: span 2; background: #FF6766; color: white; }
.grid .tall { grid-row: span 2; background: #1F3F66; color: white; }
.grid .full { grid-column: 1 / -1; background: #FFE3B3; }
---
<div class="grid">
  <div class="full">1 / -1 — на всю ширину</div>
  <div class="wide">span 2</div><div class="tall">строки: span 2</div>
  <div>4</div><div>5</div>
</div>
```

## Выравнивание внутри ячеек

| Свойство | Где | Что |
| --- | --- | --- |
| `justify-items` | у сетки | содержимое ячеек по горизонтали: `start`, `center`, `end`, `stretch` |
| `align-items` | у сетки | по вертикали |
| `place-items: center` | у сетки | оба сразу — центр в каждой ячейке |
| `justify-self`, `align-self` | у элемента | только этот элемент |

```example place-items: center
.stage { display: grid; place-items: center; height: 140px; background: #1F3F66; }
.stage div { background: #FFE3B3; padding: 10px 20px; }
---
<div class="stage"><div>В центре одной строкой</div></div>
```

## Flex или grid?

- элементы **в ряд**, их число и размеры заранее неизвестны (меню, метки, кнопки) — **flex**;
- нужна **сетка** с выровненными колонками и строками (галерея, расписание, каркас страницы) — **grid**.
