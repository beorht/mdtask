# Flexbox: элементы и раскладки

В теме 10 мы настраивали **контейнер**. Теперь — свойства самих **элементов**: сколько места каждый берёт и как
встаёт.

## flex-grow, flex-shrink, flex-basis

| Свойство | Что значит | По умолчанию |
| --- | --- | --- |
| `flex-basis` | исходный размер по главной оси (`200px`, `30%`, `auto`) | `auto` — по содержимому или `width` |
| `flex-grow` | какую **долю свободного места** забрать (0 — не растягиваться) | `0` |
| `flex-shrink` | можно ли **сжиматься**, если места мало (0 — нельзя) | `1` |

Короткая запись: `flex: grow shrink basis`. Самые нужные:

- `flex: 1` — «займи свободное место поровну с остальными» (= `1 1 0`);
- `flex: 0 0 200px` — ровно 200px, не растягиваться и не сжиматься;
- `flex: 2` у одного и `flex: 1` у другого — пропорция 2 : 1.

```example Поле растягивается, кнопка — своей ширины
.search { display: flex; gap: 8px; }
.search input { flex: 1; padding: 8px; }
.search button { padding: 8px 16px; }
---
<form class="search"><input placeholder="Поиск"><button>Найти</button></form>
```

```example Колонки 1 : 2 : 1
.cols { display: flex; gap: 8px; }
.cols div { background: #FFB173; padding: 10px; }
.a, .c { flex: 1; }
.b { flex: 2; background: #FF6766; }
---
<div class="cols"><div class="a">1</div><div class="b">2</div><div class="c">1</div></div>
```

## Отдельный элемент: order, align-self, margin auto

- `order: -1` — переставить элемент в начало, не трогая разметку (меньше число — раньше);
- `align-self` — выровнять **один** элемент по поперечной оси иначе, чем остальные;
- `margin-left: auto` — забрать всё свободное место слева: элемент и всё после него уедет вправо. Так делают шапку
  «логотип … меню, кнопка».

```example margin-left: auto
.header { display: flex; align-items: center; gap: 12px; background: #1C1A1B; color: #FFE3B3; padding: 10px; }
.push { margin-left: auto; }
---
<header class="header"><b>Кафе</b><span class="push">Меню</span><span>Контакты</span><span>Войти</span></header>
```

## Типичные раскладки

**Боковая колонка + контент:** `aside { flex: 0 0 220px; } main { flex: 1; }`.

**Карточки одинаковой высоты с кнопкой внизу:** элементы flex-ряда по умолчанию одной высоты (`stretch`); внутри
карточки — `display: flex; flex-direction: column;`, у кнопки — `margin-top: auto`.

```example Кнопки «Купить» на одной линии
.cards { display: flex; gap: 10px; }
.card { flex: 1; display: flex; flex-direction: column; background: #FFF3E6; padding: 10px; }
.card button { margin-top: auto; }
---
<div class="cards">
  <div class="card"><b>Эспрессо</b><p>Коротко.</p><button>Купить</button></div>
  <div class="card"><b>Раф</b><p>Длинное описание напитка в три строки, чтобы было видно разницу высоты.</p><button>Купить</button></div>
</div>
```

**Подвал прижат к низу короткой страницы:** у обёртки — `display: flex; flex-direction: column; min-height: 100vh;`,
у основной части — `flex: 1`.

**Медиа-объект** (картинка слева, текст справа): `display: flex; gap: 12px;`, у картинки — `flex-shrink: 0`, чтобы
длинный текст её не сжимал.
