# Позиционирование

`position` вынимает элемент из обычного потока или сдвигает его. Координаты задают свойства `top`, `right`,
`bottom`, `left`.

| Значение | Откуда считаются координаты | Место в потоке |
| --- | --- | --- |
| `static` | не двигается (по умолчанию) | занимает |
| `relative` | от **своего обычного места** | занимает старое место |
| `absolute` | от ближайшего **позиционированного предка** (у кого `position` не `static`), иначе от страницы | **не** занимает |
| `fixed` | от **окна** — не уезжает при прокрутке | не занимает |
| `sticky` | ведёт себя как обычный, пока не доедет до `top`, затем «прилипает» | занимает |

```example relative: сдвиг от своего места
.box { width: 140px; padding: 10px; background: #DDE8F5; margin-bottom: 6px; }
.moved { position: relative; top: 10px; left: 40px; background: #FFE3B3; }
---
<div class="box">обычный</div>
<div class="box moved">сдвинут</div>
<div class="box">обычный</div>
```

## Значок в углу карточки

Самый частый приём: родителю — `position: relative` (он становится «точкой отсчёта»), значку — `position: absolute`
и координаты.

```example absolute внутри relative
.card { position: relative; width: 220px; padding: 20px; background: #FFF3E6; border-radius: 12px; }
.badge { position: absolute; top: 8px; right: 8px; background: #CA2851; color: white; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
---
<div class="card">
  <span class="badge">Новинка</span>
  <h3>Матча-латте</h3>
  <p>Зелёный чай с молоком.</p>
</div>
```

`inset: 0` — то же, что `top: 0; right: 0; bottom: 0; left: 0`: блок растягивается на всего родителя (затемнение
поверх картинки). Центр: `top: 50%; left: 50%; transform: translate(-50%, -50%)`.

## Порядок наложения: z-index

Позиционированные элементы могут перекрываться. Кто сверху, решает `z-index`: больше число — ближе к зрителю.
Работает только у элементов с `position`, отличным от `static` (и у элементов flex/grid).

```example z-index
.a, .b { position: absolute; width: 120px; height: 80px; padding: 8px; color: white; }
.wrap { position: relative; height: 130px; }
.a { background: #CA2851; top: 0; left: 0; z-index: 2; }
.b { background: #1F3F66; top: 30px; left: 60px; z-index: 1; }
---
<div class="wrap"><div class="a">z-index: 2</div><div class="b">z-index: 1</div></div>
```

## fixed и sticky

- шапка, которая всегда видна: `position: fixed; top: 0; left: 0; right: 0;` (содержимому страницы нужен отступ
  сверху, иначе шапка его закроет);
- заголовок раздела, «прилипающий» при прокрутке: `position: sticky; top: 0;`.
