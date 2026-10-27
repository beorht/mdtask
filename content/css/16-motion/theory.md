# Переходы, трансформации и анимации

## Трансформации: transform

`transform` меняет вид элемента **без влияния на соседей** — они не сдвигаются.

| Функция | Пример | Что делает |
| --- | --- | --- |
| `translate(x, y)` | `translateY(-6px)` | сдвиг |
| `scale(n)` | `scale(1.1)` | увеличение / уменьшение |
| `rotate(угол)` | `rotate(45deg)` | поворот |
| `skew(угол)` | `skewX(10deg)` | наклон |

Несколько функций пишут **через пробел** в одном `transform`: `translateX(20px) rotate(3deg)`. Поворот и масштаб
идут вокруг **точки трансформации** `transform-origin` (по умолчанию — центр): `transform-origin: left bottom`.

```example Наведите на карточки
.row { display: flex; gap: 12px; padding: 16px; }
.c { width: 90px; height: 60px; background: #FFB173; display: grid; place-items: center; transition: transform 0.3s; }
.a:hover { transform: translateY(-8px); }
.b:hover { transform: scale(1.15); }
.d:hover { transform: rotate(15deg); }
---
<div class="row"><div class="c a">сдвиг</div><div class="c b">масштаб</div><div class="c d">поворот</div></div>
```

## Плавный переход: transition

Без `transition` новое значение (например, при `:hover`) включается мгновенно. С ним — плавно.

```css
.btn { background: #CA2851; transition: background-color 0.3s ease; }
.btn:hover { background: #1C1A1B; }
```

| Часть | Пример | Значит |
| --- | --- | --- |
| свойство | `background-color`, `transform`, `all` | что плавно меняется |
| длительность | `0.3s`, `300ms` | сколько длится |
| характер | `ease` (по умолчанию), `linear`, `ease-in`, `ease-out`, `ease-in-out` | как ускоряется |
| задержка | `0.2s` | через сколько начнётся |

Нескольким свойствам — через запятую: `transition: background-color 0.3s, transform 0.5s ease-out`. Плавно
меняются числовые свойства и цвета; `display` — нет.

## Анимация: @keyframes

Переход срабатывает при смене состояния. **Анимация** играет сама — по ключевым кадрам:

```css
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.3); }
}
.dot { animation: pulse 1.5s ease-in-out infinite; }
```

| Свойство | Пример |
| --- | --- |
| `animation-name` | `pulse` — имя из `@keyframes` |
| `animation-duration` | `1.5s` |
| `animation-timing-function` | `linear` — для вращения |
| `animation-delay` | `0.5s` |
| `animation-iteration-count` | `3`, `infinite` |
| `animation-direction` | `alternate` — туда и обратно |
| `animation-fill-mode` | `both` — держать первый кадр до начала и последний после конца |

```example Загрузка, пульс, появление
.spin { width: 36px; height: 36px; border: 4px solid #EEE; border-top-color: #CA2851; border-radius: 50%; animation: spin 1s linear infinite; }
.dot { width: 16px; height: 16px; border-radius: 50%; background: #FF6766; animation: pulse 1.5s ease-in-out infinite; margin: 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.5); } }
---
<div class="spin"></div>
<div class="dot"></div>
```

## Меньше движения

Некоторым людям анимации мешают (укачивает, отвлекает), и они включают в системе настройку «уменьшить движение».
Её можно учесть:

```css
@media (prefers-reduced-motion: reduce) {
  .spinner { animation: none; }
}
```

Хорошие привычки: анимировать в основном `transform` и `opacity` (они плавные и не перестраивают страницу),
длительность переходов — 0.15–0.4s, бесконечные анимации — только для индикаторов.
