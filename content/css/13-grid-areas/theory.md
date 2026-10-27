# Grid: области и макеты страниц

## Именованные области

Каркас страницы удобно «нарисовать» прямо в CSS: каждой строке сетки — строка в кавычках, каждой ячейке — имя
области.

```css
.page {
  display: grid;
  grid-template-columns: 200px 1fr;
  grid-template-areas:
    "header header"
    "nav    main"
    "footer footer";
}
.top    { grid-area: header; }
.menu   { grid-area: nav; }
.content{ grid-area: main; }
.bottom { grid-area: footer; }
```

Правила: каждая строка — одинаковое число ячеек; область — прямоугольник; точка `.` — пустая ячейка.

```example Каркас «шапка — меню — контент — подвал»
.page { display: grid; grid-template-columns: 120px 1fr; grid-template-areas: "header header" "nav main" "footer footer"; gap: 6px; }
.page > * { padding: 10px; background: #FFE3B3; }
.h { grid-area: header; background: #1C1A1B; color: #FFE3B3; }
.n { grid-area: nav; }
.m { grid-area: main; background: #FFF3E6; }
.f { grid-area: footer; background: #3B3835; color: white; }
---
<div class="page"><header class="h">Шапка</header><nav class="n">Меню</nav><main class="m">Контент</main><footer class="f">Подвал</footer></div>
```

Чтобы переставить блоки, достаточно поменять «рисунок» — разметка не меняется.

## minmax()

`minmax(250px, 1fr)` — колонка не уже 250px и не шире доли свободного места. Удобно, чтобы колонка не
«схлопывалась» на узком экране.

## Сетка, которая сама подбирает число колонок

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}
```

Браузер вставит столько колонок шириной от 150px, сколько поместится, и растянет их поровну. **Без единого
`@media`** галерея перестраивается на любой ширине.

- `auto-fill` — если элементов мало, остаются **пустые** колонки;
- `auto-fit` — пустые колонки схлопываются, и элементы **растягиваются** на всю ширину.

```example auto-fill и auto-fit при трёх элементах
.fill { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 6px; margin-bottom: 10px; }
.fit { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 6px; }
.fill div, .fit div { background: #FFB173; padding: 8px; }
---
<div class="fill"><div>fill</div><div>fill</div><div>fill</div></div>
<div class="fit"><div>fit</div><div>fit</div><div>fit</div></div>
```

## Grid снаружи, flex внутри

Типичная страница: каркас и сетка карточек — на **grid**, содержимое карточки (иконка с подписью, кнопка внизу) —
на **flex**. Они отлично сочетаются: элемент сетки может быть flex-контейнером и наоборот.
