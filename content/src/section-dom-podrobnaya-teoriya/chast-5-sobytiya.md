# Теория DOM. Часть 5. События

Событие — это сигнал браузера о том, что что-то произошло: пользователь щёлкнул мышью, нажал клавишу, ввёл текст, прокрутил страницу, картинка загрузилась. JavaScript «подписывается» на события и выполняет код в ответ. В этой части — как работают обработчики, что такое всплытие и погружение, делегирование, отмена действий браузера, свои события и приёмы для частых событий.

---

## 1. Подписка на событие: `addEventListener`

```html
<button id="buy" type="button">Купить</button>
<p id="status"></p>
```

```js
const buyButton = document.getElementById("buy");
const status = document.getElementById("status");

// addEventListener(тип события, функция-обработчик)
buyButton.addEventListener("click", () => {
  status.textContent = "Товар добавлен в корзину";
});
```

Как выполняется:

1. `addEventListener` **не выполняет** функцию — он запоминает её в списке обработчиков кнопки для события `click`.
2. Скрипт продолжает работу дальше и заканчивается.
3. Когда пользователь щёлкает кнопку, браузер создаёт объект события и по очереди вызывает все обработчики `click` этой кнопки (и её предков — см. всплытие).

Обработчик можно задать отдельной функцией — тогда его можно и снять:

```js
function onBuy(event) {
  status.textContent = "Товар добавлен в корзину";
}

buyButton.addEventListener("click", onBuy);    // подписаться
buyButton.removeEventListener("click", onBuy); // отписаться — нужна ТА ЖЕ функция

// ❌ Не сработает: это две разные функции, хоть и одинаковые по тексту
buyButton.addEventListener("click", () => console.log("hi"));
buyButton.removeEventListener("click", () => console.log("hi"));
```

### Почему не `onclick`

```html
<!-- ❌ Обработчик в HTML: смешивает разметку и логику, видит только глобальные функции -->
<button onclick="buy()">Купить</button>
```

```js
// ❌ Свойство onclick: можно задать только ОДИН обработчик, второй затрёт первый
buyButton.onclick = () => console.log("первый");
buyButton.onclick = () => console.log("второй"); // первый пропал

// ✅ addEventListener: обработчиков сколько угодно, вызываются по порядку подписки
buyButton.addEventListener("click", () => console.log("первый"));
buyButton.addEventListener("click", () => console.log("второй"));
```

## 2. Объект события

Браузер передаёт в обработчик объект с подробностями о событии:

```js
document.addEventListener("click", (event) => {
  event.type;          // "click" — тип события
  event.target;        // элемент, на котором событие ПРОИЗОШЛО (самый глубокий)
  event.currentTarget; // элемент, на котором висит ЭТОТ обработчик (здесь — document)
  event.timeStamp;     // время события в мс от загрузки страницы
  event.isTrusted;     // true — событие от пользователя, false — создано скриптом

  // Для событий мыши
  event.clientX; event.clientY; // координаты относительно окна
  event.pageX;   event.pageY;   // координаты относительно документа
  event.button;                 // 0 — левая, 1 — средняя, 2 — правая кнопка
  event.shiftKey; event.ctrlKey; event.altKey; event.metaKey; // зажатые клавиши
});
```

### `target` и `currentTarget`

```html
<div class="card" id="card">
  <h3>Тихий Дон</h3>
  <button type="button">В избранное</button>
</div>
```

```js
document.getElementById("card").addEventListener("click", (event) => {
  // Щёлкнули по кнопке:
  console.log(event.target);        // <button> — куда именно щёлкнули
  console.log(event.currentTarget); // <div class="card"> — где висит обработчик
});
```

`target` может быть любым элементом внутри карточки — заголовком, кнопкой, даже `<span>` внутри кнопки. `currentTarget` — всегда элемент с обработчиком. В стрелочной функции `this` не указывает на элемент, поэтому используйте `event.currentTarget`.

## 3. Как событие путешествует по дереву: погружение и всплытие

Когда вы щёлкаете по кнопке внутри карточки, событие проходит **три фазы**:

```text
          window
            │  1. Погружение (capturing): сверху вниз к цели
          document
            │
           html
            │
           body
            │
       div.card           3. Всплытие (bubbling): снизу вверх
            │                 обратно до window
         button   ← 2. Цель (target)
```

1. **Погружение** — от `window` вниз до родителя цели. Обработчики, добавленные с `{ capture: true }`, срабатывают здесь.
2. **Цель** — обработчики на самом элементе.
3. **Всплытие** — от цели обратно вверх до `window`. Обычные обработчики срабатывают здесь.

```html
<div id="outer">
  <div id="inner">
    <button id="btn" type="button">Нажми</button>
  </div>
</div>
```

```js
const ids = ["outer", "inner", "btn"];

for (const id of ids) {
  const node = document.getElementById(id);

  // Обработчик фазы погружения
  node.addEventListener("click", () => console.log("погружение:", id), { capture: true });

  // Обычный обработчик (фаза всплытия)
  node.addEventListener("click", () => console.log("всплытие:", id));
}

// Щелчок по кнопке выведет:
// погружение: outer
// погружение: inner
// погружение: btn
// всплытие: btn
// всплытие: inner
// всплытие: outer
```

Почти все события всплывают. Не всплывают, например, `focus`, `blur`, `mouseenter`, `mouseleave`, `load` — у них есть всплывающие пары `focusin`, `focusout`, `mouseover`, `mouseout`.

### Остановка всплытия

```js
button.addEventListener("click", (event) => {
  event.stopPropagation(); // событие не пойдёт дальше к родителям
});
```

Используйте осторожно: остановленное событие не увидят обработчики выше — например, код, который закрывает выпадающее меню по щелчку в любом месте страницы. Обычно вместо `stopPropagation` лучше проверить `event.target` в обработчике родителя.

## 4. Делегирование событий

Всплытие позволяет повесить **один** обработчик на общего предка вместо многих обработчиков на каждом элементе. Это и есть делегирование.

```html
<ul class="catalog" id="catalog">
  <li class="item" data-id="1">
    <span class="item__title">Обломов</span>
    <button class="item__fav" type="button">★</button>
    <button class="item__hide" type="button">Скрыть</button>
  </li>
  <!-- … ещё десятки пунктов, часть добавляется скриптом позже … -->
</ul>
```

```js
const catalog = document.getElementById("catalog");

// ОДИН обработчик на весь список
catalog.addEventListener("click", (event) => {
  // 1. Находим кнопку, по которой щёлкнули. closest нужен, потому что
  //    target может оказаться вложенным элементом внутри кнопки (иконкой, span).
  const button = event.target.closest("button");

  // 2. Щелчок не по кнопке или по кнопке из чужого блока — выходим
  if (!button || !catalog.contains(button)) return;

  // 3. Находим пункт списка, в котором эта кнопка, и его данные
  const item = button.closest(".item");
  const id = Number(item.dataset.id);

  // 4. Разбираем, какая это кнопка
  if (button.matches(".item__fav")) {
    item.classList.toggle("item--fav");
  } else if (button.matches(".item__hide")) {
    item.hidden = true;
  }
  console.log("действие с элементом", id);
});
```

Почему это хорошо:

- **работает для элементов, добавленных позже** — новый пункт списка не нуждается в своём обработчике, событие всё равно всплывёт до `catalog`;
- один обработчик вместо сотен — меньше памяти и кода;
- переотрисовка списка через `replaceChildren` или `innerHTML` не «ломает» обработчики.

## 5. Действия браузера по умолчанию и `preventDefault`

У многих событий есть стандартное действие: ссылка открывает адрес, форма отправляется и перезагружает страницу, правая кнопка открывает контекстное меню, флажок переключается. `event.preventDefault()` отменяет это действие:

```js
// Ссылка: не переходить по адресу, а сделать что-то своё
document.querySelector(".card__link").addEventListener("click", (event) => {
  event.preventDefault();
  openPreview(event.currentTarget.href);
});

// Форма: не перезагружать страницу (подробно — часть 6)
form.addEventListener("submit", (event) => {
  event.preventDefault();
});

// Своё контекстное меню вместо стандартного
area.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  showMenu(event.clientX, event.clientY);
});
```

`preventDefault` **не останавливает всплытие**, а `stopPropagation` **не отменяет действие браузера** — это разные вещи.

## 6. Параметры `addEventListener`

Третьим аргументом можно передать объект с настройками:

```js
// once: обработчик сработает один раз и сам удалится
banner.addEventListener("click", hideBanner, { once: true });

// capture: срабатывать на фазе погружения
document.addEventListener("click", logClick, { capture: true });

// passive: обещание браузеру, что preventDefault вызываться не будет.
// Браузер может прокручивать страницу, не дожидаясь обработчика, — прокрутка плавнее.
window.addEventListener("scroll", onScroll, { passive: true });

// signal: снять обработчик по сигналу AbortController (раздел 7)
button.addEventListener("click", onClick, { signal: controller.signal });
```

## 7. Снятие многих обработчиков: `AbortController`

Когда компонент страницы (например, модальное окно) вешает несколько обработчиков, их удобно снимать все разом:

```js
function openDialog(dialog) {
  // Контроллер «на время жизни» окна
  const controller = new AbortController();
  const { signal } = controller;

  dialog.hidden = false;

  // Все обработчики подписаны с одним signal
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  }, { signal });

  dialog.querySelector(".dialog__close").addEventListener("click", close, { signal });

  // Щелчок по тёмному фону вокруг окна
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  }, { signal });

  function close() {
    dialog.hidden = true;
    controller.abort(); // снимает ВСЕ обработчики, подписанные с этим signal
  }
}
```

## 8. Справочник событий

### Мышь и указатель

| Событие | Когда |
|---|---|
| `click` | Нажали и отпустили основную кнопку (а также Enter/пробел на кнопке) |
| `dblclick` | Двойной щелчок |
| `contextmenu` | Правая кнопка (контекстное меню) |
| `mousedown` / `mouseup` | Кнопка мыши нажата / отпущена |
| `mousemove` | Движение мыши над элементом (очень часто!) |
| `mouseover` / `mouseout` | Указатель зашёл / ушёл (всплывают, срабатывают и на детях) |
| `mouseenter` / `mouseleave` | Указатель зашёл / ушёл (не всплывают, не реагируют на детей) |
| `pointerdown` / `pointermove` / `pointerup` | То же для мыши, пальца и пера сразу — для перетаскивания |
| `wheel` | Колесо мыши |

### Клавиатура

```js
document.addEventListener("keydown", (event) => {
  // event.key — ЧТО введено с учётом раскладки: "a", "ф", "Enter", "Escape", "ArrowUp"
  // event.code — КАКАЯ физическая клавиша: "KeyA" (и для "a", и для "ф"), "Enter"
  console.log(event.key, event.code);

  // Сочетание Ctrl+S (или Cmd+S на Mac)
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault(); // не открывать окно «Сохранить страницу»
    saveDraft();
  }

  // event.repeat — клавишу держат, и событие повторяется
  if (event.repeat) return;
});
```

Для **горячих клавиш** используйте `event.code` (не зависит от раскладки), для **ввода символов** — `event.key`, а лучше событие `input` у поля.

### Ввод и фокус

| Событие | Когда |
|---|---|
| `input` | Каждое изменение значения поля (каждая буква, вставка, удаление) |
| `change` | Изменение «подтверждено»: поле потеряло фокус, флажок или список изменён |
| `focus` / `blur` | Элемент получил / потерял фокус (не всплывают) |
| `focusin` / `focusout` | То же, но всплывают — удобно для делегирования |
| `submit` | Отправка формы (на `<form>`) |
| `reset` | Сброс формы |

### Окно и документ

| Событие | Когда |
|---|---|
| `DOMContentLoaded` | DOM построен |
| `load` | Загружено всё (на `window`) или конкретная картинка (на `<img>`) |
| `error` | Ошибка загрузки картинки или скрипта |
| `resize` | Изменился размер окна (на `window`) |
| `scroll` | Прокрутка страницы или блока |
| `visibilitychange` | Вкладка скрыта / снова видна (`document.visibilityState`) |
| `online` / `offline` | Пропало / появилось подключение к сети |

## 9. Частые события: `debounce` и `throttle`

`input`, `scroll`, `resize`, `mousemove` происходят десятки раз в секунду. Если на каждое событие делать тяжёлую работу (фильтровать тысячи записей, отправлять запрос на сервер), страница начнёт тормозить. Есть два классических приёма.

### `debounce` — выполнить, когда события **прекратились**

```js
// Возвращает новую функцию, которая вызывает fn только через delay мс
// после ПОСЛЕДНЕГО вызова. Каждый новый вызов откладывает выполнение заново.
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);                            // отменяем прошлый запланированный вызов
    timer = setTimeout(() => fn.apply(this, args), delay); // и планируем новый
  };
}

const searchInput = document.querySelector("#search-input");

// Пользователь печатает «тихий дон» — запрос уйдёт один раз,
// через 300 мс после последней буквы, а не 9 раз.
searchInput.addEventListener("input", debounce((event) => {
  loadSuggestions(event.target.value);
}, 300));
```

### `throttle` — выполнять **не чаще**, чем раз в N мс

```js
// Вызывает fn сразу, а следующие вызовы игнорирует, пока не пройдёт interval мс
function throttle(fn, interval) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= interval) {
      last = now;
      fn.apply(this, args);
    }
  };
}

const header = document.querySelector(".header");

// Во время прокрутки проверяем положение не чаще 10 раз в секунду
window.addEventListener("scroll", throttle(() => {
  header.classList.toggle("header--compact", window.scrollY > 80);
}, 100), { passive: true });
```

| | `debounce` | `throttle` |
|---|---|---|
| Когда вызывает | После паузы в событиях | Регулярно, не чаще интервала |
| Подходит для | Поиск по мере ввода, сохранение черновика, `resize` | Прокрутка, движение мыши, перетаскивание |

## 10. Свои события: `CustomEvent`

Части страницы можно связывать своими событиями — так они не знают друг о друге напрямую:

```js
// Модуль корзины сообщает: «корзина изменилась»
function addToCart(product) {
  cart.push(product);

  // Создаём событие с данными в detail. bubbles: true — пусть всплывает.
  const event = new CustomEvent("cart:change", {
    bubbles: true,
    detail: { count: cart.length, product },
  });
  document.dispatchEvent(event); // «запускаем» событие
}

// Шапка сайта слушает и обновляет счётчик корзины. Про addToCart она ничего не знает.
document.addEventListener("cart:change", (event) => {
  document.querySelector(".header__cart-count").textContent = event.detail.count;
});
```

`dispatchEvent` вызывает обработчики **сразу и синхронно** — код после `dispatchEvent` выполнится, когда все обработчики отработают.

Можно и «нажать» кнопку из кода: `button.click()` запускает настоящее событие `click` (с `isTrusted: false`).

## 11. Как браузер выполняет обработчики: очередь событий

JavaScript на странице выполняется **в одном потоке**. Браузер складывает произошедшие события в очередь и выполняет обработчики **по одному**, когда текущий код закончился:

```js
button.addEventListener("click", () => {
  status.textContent = "Считаем…";

  // Тяжёлый цикл на 3 секунды блокирует поток:
  const end = Date.now() + 3000;
  while (Date.now() < end) {}

  status.textContent = "Готово";
});
// Пользователь НЕ увидит "Считаем…": браузер перерисовывает страницу
// только после того, как обработчик закончился. Все 3 секунды страница «зависла» —
// щелчки и ввод ждут в очереди.
```

Отсюда правила:

- обработчик должен работать **быстро**;
- долгие операции (запросы к серверу) — асинхронные, через `fetch` и `await` (часть 7);
- чтобы браузер успел показать промежуточное состояние, работу можно отложить: `setTimeout(work, 0)` или `requestAnimationFrame`.

## 12. Частые ошибки

- **`addEventListener("click", handler())`** — со скобками функция вызывается **сразу**, а подписывается её результат (`undefined`). Нужно `addEventListener("click", handler)`.
- **`"onclick"` вместо `"click"`** — в `addEventListener` тип события пишется без `on`.
- **Обработчик на элементах, которых ещё нет** — используйте делегирование.
- **`event.target` оказался `<span>` внутри кнопки** — используйте `event.target.closest("button")`.
- **Обработчик добавляется много раз** — например, `addEventListener` внутри функции `render()`, которая вызывается после каждого изменения. Каждая отрисовка добавляет ещё один обработчик, и действие выполняется дважды, трижды… Подписывайтесь один раз вне `render()` или используйте делегирование.
- **`removeEventListener` не работает** — передана другая функция (новая стрелочная) или не совпадает `capture`.
- **Кнопка внутри формы перезагружает страницу** — у `<button>` в форме по умолчанию `type="submit"`. Для обычных кнопок пишите `type="button"`.

**Проверьте себя:**

1. В каком порядке сработают обработчики `click` на `body`, на `div` и на кнопке внутри `div`?
2. Чем `event.target` отличается от `event.currentTarget`?
3. Почему делегирование работает для элементов, добавленных после подписки?
4. Что выбрать для поиска по мере ввода — `debounce` или `throttle`? Почему?
5. Чем отличаются `preventDefault()` и `stopPropagation()`?

Следующая часть — формы: поля ввода, `FormData` и проверка данных.
