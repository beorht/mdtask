# Списки, ссылки, таблицы и формы

## Меню из списка

Меню размечают списком ссылок — так правильно по смыслу. Оформление: убрать маркеры и отступы, выстроить в ряд.

```example Навигация из ul
.nav { list-style: none; margin: 0; padding: 0; display: flex; gap: 4px; background: #1C1A1B; }
.nav a { display: block; padding: 10px 14px; color: #FFE3B3; text-decoration: none; }
.nav a:hover, .nav .current { background: #CA2851; color: white; }
---
<ul class="nav"><li><a class="current" href="#">Главная</a></li><li><a href="#">Меню</a></li><li><a href="#">Контакты</a></li></ul>
```

`list-style-type`: `disc`, `circle`, `square`, `decimal`, `upper-roman`, `none`; `list-style-position: inside` —
маркер внутри текста.

## Ссылки

Состояния ссылки записывают в порядке **L-V-H-A**: `:link`, `:visited`, `:hover`, `:active`. Подчёркивание лучше
не убирать у ссылок внутри текста — по нему их узнают; в меню и кнопках его убирают.

## Таблицы

| Свойство | Зачем |
| --- | --- |
| `border-collapse: collapse` | соседние рамки ячеек сливаются в одну линию |
| `padding` у `th`, `td` | воздух в ячейках |
| `text-align: right` | числа выравнивают по правому краю |
| `tr:nth-child(even)` | «зебра» |
| `caption-side` | подпись сверху или снизу |

```example Аккуратная таблица
table { border-collapse: collapse; width: 100%; }
th, td { border-bottom: 1px solid #DDD; padding: 8px 10px; text-align: left; }
th { background: #1C1A1B; color: #FFE3B3; }
td:last-child, th:last-child { text-align: right; }
tbody tr:nth-child(even) { background: #FFF3E6; }
---
<table>
  <thead><tr><th>Напиток</th><th>Объём</th><th>Цена</th></tr></thead>
  <tbody><tr><td>Эспрессо</td><td>30 мл</td><td>150</td></tr><tr><td>Капучино</td><td>250 мл</td><td>220</td></tr><tr><td>Раф</td><td>300 мл</td><td>290</td></tr></tbody>
</table>
```

## Формы

- поля и кнопки **не наследуют шрифт** — `font: inherit`;
- `width: 100%` + `box-sizing: border-box`, чтобы поле не вылезало из блока;
- заметный фокус: `:focus` с цветной рамкой или `outline`;
- подпись над полем: `label { display: block; }`.

```example Поле и кнопка
.form label { display: block; margin-bottom: 4px; font-weight: 600; }
.form input { font: inherit; width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #CCC; border-radius: 8px; }
.form input:focus { border-color: #CA2851; outline: 2px solid #FFE3B3; }
.form button { margin-top: 10px; font: inherit; padding: 10px 18px; border: 0; border-radius: 8px; background: #CA2851; color: white; }
---
<form class="form"><label for="e">Почта</label><input id="e" placeholder="you@mail.ru"><button>Войти</button></form>
```
