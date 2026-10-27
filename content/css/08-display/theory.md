# display и поток

Браузер выкладывает элементы **потоком**: сверху вниз и слева направо. Как элемент встаёт в поток, решает `display`.

## Блочные и строчные

| | `block` | `inline` | `inline-block` |
| --- | --- | --- | --- |
| Примеры по умолчанию | `div`, `p`, `h1`, `ul`, `li`, `section` | `span`, `a`, `strong`, `em`, `img` | `button`, `input` |
| Встаёт | с новой строки, на всю ширину | в строку с текстом | в строку |
| `width`, `height` | работают | **не** работают | работают |
| Вертикальные `margin`/`padding` | раздвигают соседей | не раздвигают строки | раздвигают |

```example Одни и те же span — строчные и строчно-блочные
.inline span { background: #FFE3B3; padding: 8px; }
.ib span { display: inline-block; width: 90px; background: #FFE3B3; padding: 8px; margin: 4px; }
---
<p class="inline"><span>один</span> <span>два</span> <span>три</span></p>
<p class="ib"><span>один</span> <span>два</span> <span>три</span></p>
```

Любой элемент можно переключить: `li { display: inline-block; }` выстраивает пункты списка в ряд (так раньше делали
меню; сейчас чаще — flex, тема 10).

## Скрыть элемент

- `display: none` — элемента **как будто нет**: место освобождается;
- `visibility: hidden` — элемент невидим, но **место занимает**;
- `opacity: 0` — тоже невидим и занимает место, но на него можно нажать.

```example none против hidden
.box { display: inline-block; width: 70px; padding: 10px; background: #DDE8F5; }
.gone { display: none; }
.ghost { visibility: hidden; }
---
<p><span class="box">1</span><span class="box gone">2</span><span class="box">3</span> — второй убран</p>
<p><span class="box">1</span><span class="box ghost">2</span><span class="box">3</span> — второй спрятан, место осталось</p>
```

## Когда содержимое не помещается: overflow

| Значение | Что делает |
| --- | --- |
| `visible` | вылезает за край (по умолчанию) |
| `hidden` | обрезается |
| `auto` | появляется прокрутка, если нужно |
| `scroll` | прокрутка всегда |

Обрезать строку многоточием: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` (и ширина у блока).

```example Обрезка и многоточие
.box { width: 220px; height: 60px; overflow: auto; border: 1px solid #ccc; padding: 6px; }
.one-line { width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
---
<div class="box">Длинный текст, который не помещается в блок высотой 60 пикселей, поэтому появляется полоса прокрутки.</div>
<p class="one-line">Очень длинное название десерта, которое не влезает в строку</p>
```
