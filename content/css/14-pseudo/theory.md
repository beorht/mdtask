# Псевдоклассы и псевдоэлементы

## Псевдоклассы — состояние или положение элемента

Пишутся через **одно двоеточие** после селектора.

| Псевдокласс | Когда срабатывает |
| --- | --- |
| `:hover` | наведена мышь |
| `:focus` | элемент в фокусе (поле, в которое печатают; кнопка, выбранная клавишей Tab) |
| `:focus-visible` | фокус с клавиатуры — для заметного контура |
| `:active` | в момент нажатия |
| `:checked` | флажок или переключатель отмечен |
| `:disabled` | поле или кнопка выключены |
| `:first-child`, `:last-child` | первый / последний ребёнок родителя |
| `:nth-child(2)`, `(odd)`, `(even)`, `(3n)` | по номеру среди детей: второй, нечётные, чётные, каждый третий |
| `:not(.active)` | всё, **кроме** подходящих под селектор в скобках |

```example Наведение и фокус — наведите мышь, щёлкните в поле
.btn { background: #CA2851; color: white; border: 0; padding: 8px 16px; }
.btn:hover { background: #1C1A1B; }
.field { border: 2px solid #CCC; padding: 6px; }
.field:focus { border-color: #CA2851; outline: none; }
---
<button class="btn">Наведи на меня</button>
<p><input class="field" placeholder="Щёлкни сюда"></p>
```

```example Зебра и первый/последний
li:nth-child(odd) { background: #FFF3E6; }
li:first-child { font-weight: bold; }
li:last-child { color: #CA2851; }
---
<ul><li>Первый</li><li>Второй</li><li>Третий</li><li>Четвёртый</li><li>Последний</li></ul>
```

**Флажок управляет соседом:** `:checked` вместе с комбинатором `+` или `~` позволяет менять стиль подписи и даже
показывать блоки без JavaScript.

```example :checked + label
input:checked + label { color: #2E7D4F; font-weight: bold; text-decoration: line-through; }
---
<p><input type="checkbox" id="t1" checked><label for="t1"> Купить молоко</label></p>
<p><input type="checkbox" id="t2"><label for="t2"> Позвонить в кафе</label></p>
```

## Псевдоэлементы — «части» элемента

Пишутся через **два двоеточия**.

| Псевдоэлемент | Что это |
| --- | --- |
| `::before`, `::after` | дополнительный блок до / после содержимого; обязательно свойство `content` |
| `::first-letter` | первая буква — для буквицы |
| `::first-line` | первая строка |
| `::placeholder` | подсказка в пустом поле |
| `::selection` | выделенный мышью текст |
| `::marker` | маркер пункта списка |

```example ::before и ::after
.done::before { content: "✓ "; color: #2E7D4F; font-weight: bold; }
.more::after { content: " →"; }
.price::after { content: " ₽"; color: #888; }
---
<p class="done">Задание выполнено</p>
<p><a class="more" href="#">Читать дальше</a></p>
<p class="price">390</p>
```

`content: ""` (пустая строка) даёт пустой блок — из него рисуют декоративные полоски, значки, треугольники; ему
можно задать `display: block`, размеры, фон, `position: absolute`.

```example Буквица
.story::first-letter { font-size: 48px; float: left; line-height: 1; margin-right: 6px; color: #CA2851; }
---
<p class="story">Однажды утром в нашем кафе появился новый гость. Он заказал тыквенный латте и остался на весь день.</p>
```
