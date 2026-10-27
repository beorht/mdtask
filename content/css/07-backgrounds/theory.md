# Фон, рамки и тени

## Фон

| Свойство | Пример | Что делает |
| --- | --- | --- |
| `background-color` | `#FFF3E6` | цвет фона |
| `background-image` | `url("img/banner.jpg")`, градиент | картинка или градиент |
| `background-size` | `cover`, `contain`, `100px 50px` | размер картинки: `cover` — заполнить блок целиком (края обрежутся), `contain` — вписать целиком |
| `background-position` | `center`, `right top`, `20% 50%` | где стоит картинка |
| `background-repeat` | `no-repeat`, `repeat-x`, `repeat` | повторять ли |
| `background` | `#333 url(a.png) center / cover no-repeat` | всё сразу |

```example Баннер: картинка заполняет блок
.banner {
  height: 160px;
  background-image: url("/img/css-course/banner.svg");
  background-size: cover;
  background-position: center;
  color: white;
  padding: 16px;
}
---
<div class="banner"><h2>Летнее меню</h2></div>
```

## Градиенты

Градиент — это `background-image`, который браузер рисует сам:

- `linear-gradient(90deg, #CA2851, #FFB173)` — по прямой (угол или `to right`, `to bottom`);
- `radial-gradient(circle, #FFE3B3, #FF6766)` — от центра кругами;
- цветов может быть сколько угодно, можно указать позиции: `linear-gradient(#fff 0%, #eee 70%, #ccc 100%)`.

```example Линейный и радиальный
.a { height: 60px; background: linear-gradient(90deg, #CA2851, #FF6766, #FFB173); }
.b { height: 90px; background: radial-gradient(circle, #FFE3B3, #FF6766); margin-top: 8px; }
---
<div class="a"></div>
<div class="b"></div>
```

## Скругления

`border-radius: 12px` скругляет все углы; `50%` у квадрата даёт круг; можно по углам: `16px 16px 0 0`.

## Тени

`box-shadow: сдвиг-x сдвиг-y размытие растяжение цвет`, например `0 8px 24px rgba(0, 0, 0, 0.15)` — мягкая тень
снизу. Слово `inset` делает тень внутренней. Теней можно несколько через запятую.

```example Карточка со скруглением и тенью, круглая аватарка
.card { width: 240px; padding: 16px; border-radius: 16px; background: white; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15); }
.avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; }
---
<div class="card">
  <img class="avatar" src="/img/css-course/avatar.svg" alt="">
  <p>Карточка с мягкой тенью.</p>
</div>
```

## Контур (outline)

`outline` — линия **снаружи** рамки, не занимает места и не сдвигает соседей. Браузер рисует его у элемента в фокусе
(клавиша Tab) — не убирайте его без замены, иначе людям, которые пользуются клавиатурой, не видно, где они.
`outline-offset` отодвигает контур от элемента.
