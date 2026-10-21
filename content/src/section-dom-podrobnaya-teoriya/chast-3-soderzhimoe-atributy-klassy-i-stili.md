# Теория DOM. Часть 3. Содержимое, атрибуты, классы и стили

Элемент найден — теперь его можно читать и менять: текст, вложенную разметку, атрибуты, классы, стили, размеры. В этой части разбираем каждый способ и то, **что при этом делает браузер**.

Разметка для примеров:

```html
<article class="card" id="book-7" data-id="7" data-price="450" data-in-stock="true">
  <img class="card__cover" src="covers/onegin.jpg" alt="Обложка">
  <h3 class="card__title">Евгений <em>Онегин</em></h3>
  <p class="card__author">А. С. Пушкин</p>
  <a class="card__link" href="/books/7" title="Подробнее">Подробнее</a>
  <span class="card__hint" hidden>Нет в наличии</span>
</article>
```

```css
.card            { border: 1px solid #ccc; padding: 16px; border-radius: 8px; }
.card--selected  { border-color: #2563eb; box-shadow: 0 0 0 2px #93c5fd; }
.card--muted     { opacity: 0.5; }
```

---

## 1. Текст и разметка внутри элемента

### `textContent` — весь текст

```js
const title = document.querySelector(".card__title");

// ЧТЕНИЕ: склеивает текст всех потомков, теги отбрасывает
console.log(title.textContent); // "Евгений Онегин"

// ЗАПИСЬ: удаляет ВСЕХ детей элемента и вставляет один текстовый узел.
// Тег <em> пропадёт — теперь внутри h3 только текст.
title.textContent = "Евгений Онегин (роман в стихах)";

// Символы < и > в тексте НЕ становятся тегами — они выводятся как есть
title.textContent = "<b>не жирный</b>"; // на экране буквально: <b>не жирный</b>
```

Как выполняется запись: браузер удаляет из дерева все дочерние узлы элемента, создаёт новый текстовый узел с вашей строкой и добавляет его. Разбор HTML не происходит, поэтому это **быстро и безопасно**.

### `innerText` — видимый текст

```js
// innerText учитывает CSS: не возвращает скрытый текст (display: none, hidden)
// и переводит <br> и блоки в переносы строк — как пользователь видит на экране.
const card = document.querySelector(".card");
console.log(card.innerText);   // без "Нет в наличии" — span скрыт
console.log(card.textContent); // с "Нет в наличии" и со всеми пробелами из HTML
```

Чтобы получить `innerText`, браузеру нужно знать, что видно, а значит — **пересчитать раскладку**. Поэтому `innerText` медленнее. Используйте `textContent`, если вам не нужна именно «видимость».

### `innerHTML` — разметка внутри

```js
// ЧТЕНИЕ: HTML-код содержимого строкой
console.log(title.innerHTML); // "Евгений <em>Онегин</em>"

// ЗАПИСЬ: строка РАЗБИРАЕТСЯ как HTML, из неё строятся новые узлы
title.innerHTML = "Евгений <em>Онегин</em> <small>1833</small>";
```

Как выполняется запись: браузер удаляет старых детей, запускает HTML-парсер на вашей строке, строит из неё узлы и вставляет. Старые узлы **уничтожаются** — вместе с обработчиками событий, которые на них висели, и с введённым в поля текстом.

### `outerHTML` — разметка вместе с самим элементом

```js
console.log(title.outerHTML); // "<h3 class=\"card__title\">Евгений <em>Онегин</em> …</h3>"

// Запись заменяет сам элемент. Переменная title после этого
// указывает на СТАРЫЙ элемент, которого на странице уже нет!
title.outerHTML = "<h2 class='card__title'>Онегин</h2>";
```

### Безопасность: почему `innerHTML` опасен

```js
// Представим, что имя пришло от пользователя (из поля формы или с сервера)
const userName = '<img src="x" onerror="alert(document.cookie)">';

// ❌ ОПАСНО: браузер создаст <img>, картинка не загрузится,
// сработает onerror — и выполнится чужой JavaScript-код (атака XSS).
greeting.innerHTML = "Здравствуйте, " + userName;

// ✅ БЕЗОПАСНО: строка вставится как текст, тег не создастся
greeting.textContent = "Здравствуйте, " + userName;
```

**Правило:** данные, которые вы не написали сами (ввод пользователя, ответ сервера, параметры адреса), выводите только через `textContent` или создавайте элементы через `createElement` (часть 4). `innerHTML` — только для вашей собственной, заранее известной разметки.

## 2. Атрибуты и свойства — в чём разница

Когда браузер разбирает HTML, он создаёт объект элемента и для большинства стандартных атрибутов заводит одноимённые **свойства** (DOM-свойства). Атрибут — это то, что написано в HTML. Свойство — поле объекта в JavaScript.

```js
const link = document.querySelector(".card__link");

// Методы для атрибутов работают со СТРОКАМИ, как в HTML
link.getAttribute("href");          // "/books/7" — ровно как написано
link.setAttribute("target", "_blank");
link.hasAttribute("title");         // true
link.removeAttribute("title");
link.toggleAttribute("download");   // есть — убрать, нет — добавить

// Свойство может отличаться от атрибута: браузер его обрабатывает
link.href;                          // "http://site.ru/books/7" — полный адрес!
```

### Где разница особенно важна: поля ввода

```html
<input id="qty" type="number" value="1">
```

```js
const qty = document.getElementById("qty");

// Пользователь ввёл в поле 5.
qty.value;                 // "5" — СВОЙСТВО: текущее значение
qty.getAttribute("value"); // "1" — АТРИБУТ: начальное значение из HTML
qty.defaultValue;          // "1" — то же начальное значение через свойство

// Атрибут value задаёт начальное значение, а то, что ввёл пользователь, — в свойстве.
// form.reset() возвращает поля к значению атрибута.
```

То же с флажками: свойство `checkbox.checked` — отмечен ли он сейчас, атрибут `checked` — был ли отмечен при загрузке.

### Логические атрибуты

`hidden`, `disabled`, `checked`, `required`, `readonly` — атрибуты-«флажки»: важно не значение, а **есть атрибут или нет**. Через свойства с ними работать проще:

```js
const button = document.querySelector("button");

button.disabled = true;   // добавит атрибут disabled
button.disabled = false;  // удалит атрибут

// ❌ Ловушка: setAttribute("disabled", "false") ВКЛЮЧАЕТ disabled —
// атрибут есть, а его значение браузер не читает.
button.setAttribute("disabled", "false");
```

### Свойства с другими именами

| Атрибут в HTML | Свойство в JS | Почему |
|---|---|---|
| `class` | `className` (строка) / `classList` | `class` — зарезервированное слово в JS |
| `for` (у `<label>`) | `htmlFor` | `for` — зарезервированное слово |
| `readonly` | `readOnly` | camelCase |
| `tabindex` | `tabIndex` | camelCase |

## 3. data-атрибуты и `dataset`

Свои данные можно хранить прямо в разметке в атрибутах `data-*`. В JavaScript они доступны через объект `dataset`:

```js
const card = document.querySelector(".card");

// data-id → dataset.id, data-in-stock → dataset.inStock (дефисы превращаются в camelCase)
console.log(card.dataset.id);       // "7"
console.log(card.dataset.inStock);  // "true" — СТРОКА, не логическое значение
console.log(card.dataset.price);    // "450"  — СТРОКА, не число

// Перевод в нужный тип — всегда вручную
const price = Number(card.dataset.price);          // 450
const inStock = card.dataset.inStock === "true";   // true

// Запись создаёт атрибут data-discount="10" в HTML
card.dataset.discount = 10;
// Удаление
delete card.dataset.discount;
```

`data-*` удобны, чтобы связать элемент на странице с данными в JavaScript: в карточке хранится `data-id`, а по нему в обработчике находится объект книги в массиве.

## 4. Классы: `className` и `classList`

```js
const card = document.querySelector(".card");

// className — вся строка классов целиком
console.log(card.className);   // "card"
card.className = "card card--selected"; // ЗАМЕНЯЕТ все классы

// classList — удобный набор методов для отдельных классов
card.classList.add("card--selected");          // добавить (повторно не добавится)
card.classList.add("a", "b");                  // несколько сразу
card.classList.remove("card--muted");          // убрать (если нет — ошибки не будет)
card.classList.toggle("card--selected");       // переключить, возвращает true/false
card.classList.toggle("card--muted", !inStock);// второй аргумент: true — добавить, false — убрать
card.classList.contains("card");               // проверить → true
card.classList.replace("card--muted", "card--selected"); // заменить один на другой

// classList можно перебрать
for (const cls of card.classList) console.log(cls);
```

Как выполняется: вы меняете атрибут `class`, браузер заново проверяет, какие CSS-правила подходят элементу, и перерисовывает его. Сам стиль описан в CSS — в JS вы только **переключаете состояние**.

**Почему лучше классы, а не стили в JS:**

- оформление остаётся в CSS, его легко поменять, не трогая скрипт;
- одним классом меняется сразу много свойств;
- работают `:hover`, медиазапросы и плавные переходы `transition`;
- состояние видно в DevTools по имени класса.

## 5. Стили: `style` и `getComputedStyle`

### `element.style` — встроенный (inline) стиль

```js
const card = document.querySelector(".card");

// Свойства CSS с дефисом пишутся в camelCase
card.style.backgroundColor = "#f8fafc";  // background-color
card.style.borderRadius = "12px";        // border-radius
card.style.width = 300 + "px";           // единицы измерения обязательны!

// Сброс свойства: пустая строка — вернётся значение из CSS-файла
card.style.backgroundColor = "";

// Через setProperty можно писать имена как в CSS и задавать CSS-переменные
card.style.setProperty("border-color", "tomato");
card.style.setProperty("--accent", "#16a34a");

// cssText — весь атрибут style строкой (перезаписывает всё)
card.style.cssText = "color: navy; padding: 20px;";
```

> `element.style` **читает только inline-стили** — то, что записано в атрибуте `style`. Стили из CSS-файла через него не видны: `card.style.padding` вернёт `""`, хотя в CSS указано `padding: 16px`.

### `getComputedStyle` — итоговый стиль

```js
// Итоговые значения после применения ВСЕХ CSS-правил
const styles = getComputedStyle(card);
console.log(styles.padding);       // "16px"
console.log(styles.borderColor);   // "rgb(204, 204, 204)" — цвета всегда в rgb
console.log(styles.display);       // "block"

// Значение CSS-переменной
console.log(styles.getPropertyValue("--accent").trim());
```

`getComputedStyle` только читает. Чтобы вычислить итог, браузер может пересчитать стили и раскладку — не вызывайте его в больших циклах.

### Когда стиль задают из JavaScript

Inline-стиль оправдан, когда значение вычисляется и его нельзя заранее описать классом: координаты, ширина полосы прогресса, цвет, выбранный пользователем. Лучший вариант — передать значение через **CSS-переменную**, а оформление оставить в CSS:

```html
<div class="progress"><div class="progress__bar"></div></div>
```

```css
.progress      { height: 8px; background: #e5e7eb; border-radius: 4px; }
.progress__bar {
  height: 100%;
  width: calc(var(--value, 0) * 1%); /* ширина из переменной --value */
  background: #22c55e;
  transition: width 0.3s;            /* плавное изменение */
}
```

```js
const progress = document.querySelector(".progress");

function setProgress(percent) {
  // JS передаёт только ЧИСЛО, всё оформление — в CSS
  progress.style.setProperty("--value", percent);
}

setProgress(65);
```

## 6. Показать и скрыть элемент

```js
const hint = document.querySelector(".card__hint");

// 1) Атрибут hidden — самый простой способ
hint.hidden = false; // показать
hint.hidden = true;  // скрыть (как display: none)

// 2) Класс — если нужна анимация или особое оформление
hint.classList.toggle("is-visible");

// 3) style.display — работает, но смешивает стили с логикой
hint.style.display = "none";
```

> Если в вашем CSS у элемента задан `display: flex` или `display: block`, он **перебьёт** атрибут `hidden`. Помогает правило `[hidden] { display: none !important; }` в CSS.

## 7. Размеры и положение элемента

| Свойство | Что возвращает |
|---|---|
| `el.offsetWidth` / `offsetHeight` | Полный размер: содержимое + padding + border (целое число px) |
| `el.clientWidth` / `clientHeight` | Содержимое + padding, без рамок и полосы прокрутки |
| `el.scrollWidth` / `scrollHeight` | Полный размер содержимого, включая то, что спрятано за прокруткой |
| `el.scrollTop` / `scrollLeft` | На сколько пикселей прокручено содержимое (можно менять) |
| `el.getBoundingClientRect()` | Объект `{ top, left, right, bottom, width, height }` — положение **относительно окна** |
| `window.innerWidth` / `innerHeight` | Размер окна браузера |
| `window.scrollY` | Насколько прокручена страница |

```js
const card = document.querySelector(".card");
const rect = card.getBoundingClientRect();

console.log(rect.width, rect.height); // размеры, могут быть дробными
console.log(rect.top);                // расстояние от верха ОКНА (меняется при прокрутке)

// Координата относительно всего документа = относительно окна + прокрутка
const pageTop = rect.top + window.scrollY;

// Виден ли элемент сейчас на экране?
const visible = rect.bottom > 0 && rect.top < window.innerHeight;

// Прокрутить страницу к элементу плавно
card.scrollIntoView({ behavior: "smooth", block: "center" });

// Блок с прокруткой: долистали ли до конца?
const box = document.querySelector(".scroll-box");
const atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 1;
```

Как выполняется: чтобы ответить на вопрос о размерах, браузер должен **закончить раскладку** с учётом всех последних изменений. Если вы только что поменяли DOM, чтение `offsetHeight` заставит браузер сразу пересчитать раскладку («принудительный reflow»). Об этом — в разделе производительности части 7.

## 8. Итоги части 3

| Задача | Как |
|---|---|
| Записать текст (безопасно) | `el.textContent = "…"` |
| Вставить свою разметку | `el.innerHTML = "…"` (только свои данные!) |
| Значение поля | `input.value` |
| Атрибут | `getAttribute` / `setAttribute` / `removeAttribute` |
| Логический атрибут | `el.disabled = true`, `el.hidden = false` |
| Свои данные | `el.dataset.имя` (всегда строки) |
| Классы | `classList.add / remove / toggle / contains` |
| Вычисленное значение для CSS | `el.style.setProperty("--var", значение)` |
| Итоговый стиль | `getComputedStyle(el)` |
| Размер и положение | `getBoundingClientRect()` |

**Проверьте себя:**

1. Пользователь ввёл в поле `<input value="1">` число 8. Что вернут `input.value` и `input.getAttribute("value")`?
2. Почему `card.style.padding` пустой, хотя в CSS указан отступ?
3. Чем опасна строка `list.innerHTML += "<li>" + userText + "</li>"` — назовите две проблемы (подсказка: безопасность и судьба старых элементов).
4. Как получить цену из `data-price="450"` числом?

Следующая часть — создание, вставка, перемещение и удаление элементов.
