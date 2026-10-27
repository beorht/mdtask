# Текст и шрифты

## Шрифт

```css
body { font-family: "Open Sans", Arial, sans-serif; }
```

`font-family` — список шрифтов **через запятую**: браузер берёт первый, который у него есть. Последним всегда пишут
общее семейство: `serif` (с засечками), `sans-serif` (без засечек), `monospace` (моноширинный). Название из
нескольких слов — в кавычках.

| Свойство | Значения | Что делает |
| --- | --- | --- |
| `font-size` | `16px`, `1.25rem` | размер |
| `font-weight` | `400` (normal), `700` (bold), 100…900 | насыщенность |
| `font-style` | `normal`, `italic` | курсив |
| `line-height` | `1.5` (без единиц — от размера шрифта) | высота строки |

```example Размер, насыщенность, курсив, высота строки
h2 { font-size: 28px; font-weight: 800; }
.quote { font-style: italic; font-family: Georgia, serif; }
.long { line-height: 1.8; }
---
<h2>Заголовок 28px, насыщенность 800</h2>
<p class="quote">Курсивом и шрифтом с засечками.</p>
<p class="long">Высота строки 1.8 делает длинный текст легче для чтения: строки не слипаются, глазу проще перейти на следующую.</p>
```

## Оформление текста

| Свойство | Значения |
| --- | --- |
| `text-align` | `left`, `center`, `right`, `justify` (по ширине) |
| `text-decoration` | `none`, `underline`, `line-through`, `overline`; можно стиль и цвет: `underline wavy red` |
| `text-transform` | `uppercase`, `lowercase`, `capitalize` |
| `letter-spacing` | расстояние между буквами: `2px`, `0.1em` |
| `word-spacing` | расстояние между словами |
| `text-indent` | отступ первой строки: `2em` |
| `text-shadow` | тень: `2px 2px 4px rgba(0,0,0,.3)` — сдвиг x, сдвиг y, размытие, цвет |
| `white-space` | `nowrap` — не переносить строку |

```example Подзаголовок, старая цена, тень
.kicker { text-transform: uppercase; letter-spacing: 3px; font-size: 12px; color: #CA2851; }
.old { text-decoration: line-through; color: #999; }
.price { font-size: 24px; font-weight: 700; text-shadow: 2px 2px 0 #FFE3B3; }
---
<p class="kicker">Новинка недели</p>
<p><span class="old">450 ₽</span> <span class="price">390 ₽</span></p>
```

## Правила хорошего текста

- основной текст — 16–18px, высота строки 1.4–1.7;
- длина строки — 60–80 знаков (`max-width: 65ch`, см. тему 6);
- не больше двух-трёх шрифтов на сайте;
- контраст: серый `#999` на белом читается плохо — для основного текста темнее `#555`.
