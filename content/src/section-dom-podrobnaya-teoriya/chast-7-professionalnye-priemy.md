# Теория DOM. Часть 7. Профессиональные приёмы

Основные инструменты вы уже знаете: поиск, изменение, создание элементов, события, формы. В этой части — то, что отличает учебный скрипт от кода настоящего приложения: управление состоянием, работа с сервером, сохранение данных, наблюдатели, анимации, производительность, доступность и безопасность.

---

## 1. Состояние и отрисовка

В части 4 был приём «данные → `render()` → экран». В больших интерфейсах его развивают так:

- всё, что может меняться, хранится в **одном объекте состояния**;
- состояние меняется **только через функции** (не напрямую из десяти обработчиков);
- после изменения вызывается отрисовка.

```js
// Состояние страницы каталога: всё, от чего зависит экран
const state = {
  books: [],          // данные с сервера
  genre: "all",       // выбранный жанр
  favorites: new Set(), // id избранных книг
  loading: false,     // идёт загрузка
  error: null,        // текст ошибки или null
};

// Единственный способ изменить состояние: передать изменения.
// Object.assign копирует поля из changes в state, затем экран обновляется.
function setState(changes) {
  Object.assign(state, changes);
  render();
}

// Производные данные вычисляются из состояния, а не хранятся отдельно
function visibleBooks() {
  return state.genre === "all" ? state.books : state.books.filter((b) => b.genre === state.genre);
}
```

### Точечное обновление вместо пересоздания

Полная перерисовка (`replaceChildren`) проста, но у неё есть минусы: при каждом изменении теряются фокус, выделение текста, положение прокрутки внутри элементов, и пересоздаются все узлы. Решение — **переиспользовать** элементы по ключу (`id`):

```js
const list = document.getElementById("books");
const nodes = new Map(); // id книги → её DOM-элемент (создаётся один раз)

function renderList(books) {
  const keep = new Set();

  books.forEach((book, index) => {
    let node = nodes.get(book.id);
    if (!node) {
      // Элемента для этой книги ещё нет — создаём
      node = document.createElement("li");
      node.className = "book";
      node.dataset.id = book.id;
      nodes.set(book.id, node);
    }
    // Обновляем только то, что могло измениться
    node.textContent = book.title;
    node.classList.toggle("book--fav", state.favorites.has(book.id));

    // Ставим элемент на нужное место, только если он не там
    if (list.children[index] !== node) {
      list.insertBefore(node, list.children[index] || null);
    }
    keep.add(book.id);
  });

  // Удаляем элементы книг, которых больше нет в списке
  for (const [id, node] of nodes) {
    if (!keep.has(id)) {
      node.remove();
      nodes.delete(id);
    }
  }
}
```

Именно так, только гораздо сложнее, работают библиотеки вроде React и Vue: вы описываете, *как должен выглядеть* экран при данном состоянии, а библиотека вычисляет минимальные изменения DOM.

## 2. Запросы к серверу: `fetch` и состояния загрузки

Данные для страницы часто приходят с сервера. `fetch` выполняет запрос **асинхронно**: страница не зависает, пока ждёт ответ.

```js
const list = document.getElementById("books");
const message = document.getElementById("message");

async function loadBooks() {
  // 1. Показываем, что идёт загрузка
  message.textContent = "Загрузка…";
  list.setAttribute("aria-busy", "true");

  try {
    // 2. Запрос. await ждёт ответ, не блокируя страницу
    const response = await fetch("data/books.json");

    // 3. fetch НЕ считает ошибкой ответы 404 и 500 — проверяем сами
    if (!response.ok) throw new Error(`Сервер ответил ${response.status}`);

    // 4. Разбираем JSON (тоже асинхронно)
    const books = await response.json();

    // 5. Показываем данные
    list.replaceChildren(...books.map(createBookItem));
    message.textContent = books.length ? "" : "Книг пока нет";
  } catch (error) {
    // Сюда попадают: нет сети, ответ не 2xx, неверный JSON
    message.textContent = `Не удалось загрузить список: ${error.message}`;
  } finally {
    // Выполнится в любом случае — и при успехе, и при ошибке
    list.removeAttribute("aria-busy");
  }
}

loadBooks();
```

Как выполняется: `loadBooks()` доходит до первого `await`, запускает запрос и **сразу возвращает управление** браузеру — страница остаётся отзывчивой. Когда ответ приходит, браузер продолжает функцию с места `await`.

У хорошего интерфейса всегда есть **четыре состояния**: загрузка, данные, пусто, ошибка. Продумайте, что пользователь видит в каждом.

### Отправка данных

```js
async function sendOrder(form) {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.fromEntries(new FormData(form))), // объект → строка JSON
  });
  if (!response.ok) throw new Error("Заказ не принят");
  return response.json();
}
```

### Отмена устаревшего запроса

При поиске по мере ввода может случиться гонка: запрос по «тих» ответит **позже**, чем запрос по «тихий», и на экране окажутся старые результаты. Предыдущий запрос нужно отменять:

```js
let controller = null;

async function search(query) {
  controller?.abort();              // отменяем предыдущий запрос, если он ещё идёт
  controller = new AbortController();

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,    // запрос можно отменить через этот сигнал
    });
    showResults(await response.json());
  } catch (error) {
    if (error.name === "AbortError") return; // отменили сами — это не ошибка
    showError(error);
  }
}
```

`encodeURIComponent` экранирует пробелы, `&`, `?` и кириллицу в строке запроса.

## 3. Сохранение в браузере: `localStorage` правильно

`localStorage` хранит **строки** по ключу; данные остаются после перезагрузки и закрытия браузера (для этого сайта на этом компьютере). В настоящем коде доступ к нему оборачивают:

```js
const STORAGE_KEY = "catalog:favorites:v1"; // префикс и версия — чтобы не путать с чужими ключами

function loadFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    // Проверяем форму данных: в хранилище мог оказаться мусор
    return new Set(Array.isArray(ids) ? ids.filter(Number.isInteger) : []);
  } catch (error) {
    // JSON повреждён или хранилище недоступно (приватный режим, запрет cookies)
    return new Set();
  }
}

function saveFavorites(favorites) {
  try {
    // Set не сохраняется в JSON напрямую — превращаем в массив
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
  } catch (error) {
    // Хранилище переполнено (обычно ~5 МБ) или недоступно — страница продолжает работать
    console.warn("Не удалось сохранить избранное", error);
  }
}

// Изменения из ДРУГОЙ вкладки этого же сайта
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) setState({ favorites: loadFavorites() });
});
```

| Хранилище | Сколько живёт | Объём |
|---|---|---|
| `localStorage` | Пока не очистят | ~5 МБ |
| `sessionStorage` | Пока открыта вкладка | ~5 МБ |
| Cookies | Срок задаётся; уходят на сервер с каждым запросом | ~4 КБ |
| IndexedDB | Пока не очистят | Сотни МБ, для больших данных |

Не храните в `localStorage` пароли и токены доступа: любой скрипт на странице может их прочитать.

## 4. Наблюдатели (Observers)

Браузер умеет сам сообщать о событиях, которые неудобно отслеживать через обычные события.

### `IntersectionObserver` — элемент появился на экране

Задачи: ленивая загрузка картинок, бесконечная прокрутка, анимация при появлении.

```html
<img class="lazy" data-src="covers/big-1.jpg" alt="Обложка" width="200" height="300">
```

```js
// Создаём наблюдателя. Функция вызывается, когда видимость элементов меняется.
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;  // элемент ещё не на экране

    const img = entry.target;
    img.src = img.dataset.src;            // только сейчас начинаем загрузку картинки
    observer.unobserve(img);              // больше следить не нужно
  }
}, {
  rootMargin: "200px", // начинать заранее — за 200 px до появления на экране
});

// Подключаем наблюдение за каждой картинкой
document.querySelectorAll("img.lazy").forEach((img) => observer.observe(img));
```

Для простой ленивой загрузки картинок достаточно атрибута `loading="lazy"` у `<img>`. `IntersectionObserver` нужен, когда при появлении требуется своя логика.

**Бесконечная прокрутка:** в конец списка ставится пустой элемент-«датчик», и когда он виден, загружается следующая порция:

```js
const sentinel = document.getElementById("load-more-sentinel");

new IntersectionObserver(async ([entry]) => {
  if (entry.isIntersecting && !state.loading) await loadNextPage();
}).observe(sentinel);
```

Как выполняется: браузер сам считает пересечения при прокрутке и изменении размеров — гораздо эффективнее, чем обработчик `scroll` с `getBoundingClientRect` на каждое событие.

### `ResizeObserver` — изменился размер элемента

```js
// Меняем вид карточки по ширине САМОЙ карточки, а не окна
const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const width = entry.contentRect.width;
    entry.target.classList.toggle("card--compact", width < 260);
  }
});

document.querySelectorAll(".card").forEach((card) => resizeObserver.observe(card));
```

(Во многих случаях то же самое можно сделать в CSS через контейнерные запросы `@container`.)

### `MutationObserver` — изменилось дерево DOM

```js
// Следим, как меняется список: кто-то (наш код или чужой) добавил или удалил элементы
const mutationObserver = new MutationObserver((mutations) => {
  for (const m of mutations) {
    console.log("добавлено:", m.addedNodes.length, "удалено:", m.removedNodes.length);
  }
});

mutationObserver.observe(document.getElementById("books"), {
  childList: true,   // добавление и удаление детей
  subtree: true,     // и во всех потомках
  attributes: false, // изменения атрибутов не нужны
});

// Перестать следить
// mutationObserver.disconnect();
```

`MutationObserver` вызывается не сразу после каждого изменения, а **пачкой** — после того, как текущий код закончился. Нужен редко: обычно ваш код и так знает, что он меняет. Полезен для встраиваемых виджетов и отладки.

## 5. Анимации

### CSS-переходы, запускаемые классом

Лучший способ анимации — описать её в CSS, а из JavaScript только переключать класс:

```css
.toast {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.25s, transform 0.25s; /* какие свойства анимировать и как долго */
}
.toast--visible {
  opacity: 1;
  transform: translateY(0);
}
```

```js
// Всплывающее уведомление, которое само исчезает
function showToast(text) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status"); // экранный диктор озвучит текст
  toast.textContent = text;
  document.body.append(toast);

  // Ждём кадр, чтобы браузер отрисовал начальное состояние (opacity: 0),
  // иначе переход не запустится — браузер склеит оба состояния в одно.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add("toast--visible"));
  });

  setTimeout(() => {
    toast.classList.remove("toast--visible");
    // Удаляем элемент, когда переход закончился
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, 3000);
}
```

### `requestAnimationFrame` — анимация из JavaScript

Когда значение вычисляется на каждом кадре (движение по траектории, счётчик), используйте `requestAnimationFrame`: браузер вызовет функцию прямо перед следующей отрисовкой — обычно 60 раз в секунду, а в скрытой вкладке приостановит.

```js
// Плавно меняет число в элементе от from до to за duration мс
function animateNumber(element, from, to, duration) {
  const start = performance.now();

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1); // от 0 до 1
    const eased = 1 - (1 - progress) ** 3;                  // замедление в конце
    element.textContent = Math.round(from + (to - from) * eased);

    if (progress < 1) requestAnimationFrame(frame);         // запросить следующий кадр
  }

  requestAnimationFrame(frame);
}

animateNumber(document.getElementById("total"), 0, 1250, 800);
```

### Web Animations API

```js
// Встряхнуть элемент (например, поле с ошибкой)
field.animate(
  [
    { transform: "translateX(0)" },
    { transform: "translateX(-6px)" },
    { transform: "translateX(6px)" },
    { transform: "translateX(0)" },
  ],
  { duration: 300, iterations: 1 }
);
```

### Уважайте настройки пользователя

Некоторым людям движение на экране мешает или вызывает недомогание. В системе можно включить «уменьшить движение»:

```css
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
```

```js
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduceMotion) animateNumber(totalElement, 0, total, 800);
else totalElement.textContent = total;
```

## 6. Производительность

### Как браузер обновляет страницу

После изменения DOM браузер не перерисовывает страницу мгновенно. Он **копит** изменения и в конце текущего кода, перед следующим кадром, выполняет: пересчёт стилей → раскладку (layout) → отрисовку (paint). Это быстро — если не мешать.

### Принудительная раскладка (layout thrashing)

Мешает **чтение размеров сразу после изменения**: чтобы вернуть верный `offsetHeight`, браузер обязан немедленно выполнить раскладку.

```js
const cards = document.querySelectorAll(".card");

// ❌ Медленно: чтение и запись чередуются.
// Каждая итерация: записали высоту → следующее чтение заставляет пересчитать раскладку.
cards.forEach((card) => {
  const height = card.offsetHeight;        // ЧТЕНИЕ → раскладка
  card.style.height = height + 10 + "px";  // ЗАПИСЬ → раскладка устарела
});

// ✅ Быстро: сначала все чтения, потом все записи. Раскладка — один раз.
const heights = [...cards].map((card) => card.offsetHeight); // все чтения
cards.forEach((card, i) => {
  card.style.height = heights[i] + 10 + "px";                // все записи
});
```

Свойства, которые вызывают раскладку при чтении: `offsetWidth/Height/Top/Left`, `clientWidth/Height`, `scrollWidth/Height/Top`, `getBoundingClientRect()`, `getComputedStyle()`, `innerText`.

### Что ещё помогает

- **Вставляйте пачкой**: `append(...nodes)` или `DocumentFragment` вместо сотни отдельных вставок с чтением размеров между ними.
- **Анимируйте `transform` и `opacity`**, а не `top`, `left`, `width`, `height`: первые не требуют раскладки, браузер может выполнить их на видеокарте.
- **Делегирование событий** вместо тысяч обработчиков.
- **`debounce` / `throttle`** для частых событий (часть 5), `passive: true` для `scroll` и `touchmove`.
- **Не делайте тяжёлую работу в обработчике** — поток один (часть 5, раздел 11).
- **Очень длинные списки** (тысячи строк) — показывайте порциями или «виртуальной прокруткой»: в DOM только видимые строки.
- **Меряйте, а не угадывайте**: вкладка *Performance* в DevTools показывает, на что уходит время; `console.time("render")` / `console.timeEnd("render")` — сколько длится ваш код.

## 7. Доступность (accessibility)

Страницей пользуются люди с клавиатурой вместо мыши, с экранным диктором, с плохим зрением. Хорошая новость: правильная разметка решает большую часть задач **сама**.

### Используйте подходящие элементы

```html
<!-- ❌ div-кнопка: не получает фокус с клавиатуры, не нажимается Enter/пробелом,
     диктор не знает, что это кнопка -->
<div class="btn" id="save">Сохранить</div>

<!-- ✅ Настоящая кнопка: всё это работает сразу -->
<button class="btn" id="save" type="button">Сохранить</button>
```

| Нужно | Элемент |
|---|---|
| Действие на странице | `<button type="button">` |
| Переход на другой адрес | `<a href="…">` |
| Поле с подписью | `<label>` + `<input>` (связь через вложенность или `for`/`id`) |
| Группа полей | `<fieldset>` + `<legend>` |
| Модальное окно | `<dialog>` |
| Раскрывающийся блок | `<details>` + `<summary>` |

### Состояния через ARIA-атрибуты

Когда JavaScript меняет состояние элемента, сообщите об этом и диктору:

```js
// Кнопка «В избранное» — переключатель
favButton.setAttribute("aria-pressed", String(isFavorite)); // "true" / "false"

// Кнопка, которая раскрывает меню
menuButton.setAttribute("aria-expanded", String(isOpen));
menuButton.setAttribute("aria-controls", "main-menu"); // id раскрываемого блока

// Иконка без текста — даём подпись
iconButton.setAttribute("aria-label", "Удалить из избранного");

// Область, изменения в которой нужно озвучивать (результаты, уведомления)
statusBox.setAttribute("aria-live", "polite"); // или role="status"
```

### Управление фокусом

```js
// Встроенный <dialog>: showModal() сам блокирует страницу за окном,
// закрывается по Escape и возвращает фокус туда, где он был.
const dialog = document.getElementById("book-dialog");

function openBookDialog(book) {
  dialog.querySelector(".dialog__title").textContent = book.title;
  dialog.showModal();                               // модальный режим
  dialog.querySelector(".dialog__close").focus();   // фокус внутрь окна
}

dialog.querySelector(".dialog__close").addEventListener("click", () => dialog.close());
```

Правила: после открытия окна фокус — внутри него; после закрытия — на элементе, который его открыл; после удаления элемента фокус не должен «теряться» в начало страницы. Проверьте свою страницу **только клавиатурой**: Tab, Shift+Tab, Enter, пробел, Escape. Видно ли, где фокус? Не убирайте рамку фокуса (`outline: none`) без замены.

## 8. Безопасность

### XSS — главная угроза для DOM-кода

**XSS (межсайтовый скриптинг)** — когда на страницу попадает и выполняется чужой JavaScript. В DOM-коде он почти всегда появляется так: данные, которые контролирует кто-то другой, вставляются как HTML.

Опасные места («приёмники»):

```js
el.innerHTML = data;                 // ❌
el.outerHTML = data;                 // ❌
el.insertAdjacentHTML("beforeend", data); // ❌
document.write(data);                // ❌
link.href = data;                    // ❌ если data = "javascript:alert(1)"
el.setAttribute("onclick", data);    // ❌
setTimeout(data, 0);                 // ❌ строка выполняется как код
eval(data);                          // ❌
```

Безопасные замены:

```js
el.textContent = data;               // ✅ текст, никогда не становится тегом
input.value = data;                  // ✅
el.setAttribute("title", data);      // ✅ обычные атрибуты безопасны
el.dataset.name = data;              // ✅
```

Ссылки из данных проверяйте:

```js
// Разрешаем только http и https — отбрасываем javascript:, data: и прочее
function safeUrl(value) {
  try {
    const url = new URL(value, location.href); // разбор с учётом текущего адреса
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "#";
  } catch {
    return "#"; // строка вообще не похожа на адрес
  }
}

link.href = safeUrl(book.link);
```

Если HTML от пользователя действительно нужно показать (например, отформатированный отзыв), его пропускают через **санитайзер** — библиотеку, которая оставляет только безопасные теги (например, DOMPurify). Писать свой фильтр тегов регулярными выражениями нельзя — его почти всегда можно обойти.

### Ещё несколько правил

- Ссылки, открывающиеся в новой вкладке: `<a href="…" target="_blank" rel="noopener noreferrer">` — чтобы открытая страница не получила доступ к вашей.
- Не храните секреты (пароли, токены) в коде страницы и в `localStorage`.
- Проверки в браузере — для удобства; настоящие проверки делает сервер.
- Сервер может запретить встроенные скрипты и `eval` заголовком **Content-Security-Policy** — ещё одна причина писать обработчики через `addEventListener`, а не атрибутами `onclick`.

## 9. Отладка DOM-кода

```js
// Остановить выполнение в этом месте и открыть отладчик DevTools
debugger;

// Табличный вывод массива объектов
console.table(state.books);

// Группировка сообщений
console.group("render");
console.log("книг:", visibleBooks().length);
console.groupEnd();
```

В DevTools во вкладке **Elements** можно щёлкнуть правой кнопкой по элементу → *Break on* → *subtree modifications* — выполнение остановится, когда скрипт изменит этот элемент, и вы увидите, какой код это сделал. Во вкладке **Sources** есть точки остановки на события (*Event Listener Breakpoints*: например, остановиться на любом `click`).

## 10. Итоги части 7

- Состояние — в одном объекте, изменения — через функции, экран — из состояния.
- `fetch` асинхронный; проверяйте `response.ok`, показывайте загрузку, пустоту и ошибку; отменяйте устаревшие запросы.
- `localStorage` оборачивайте в `try/catch` и проверяйте прочитанные данные.
- Наблюдатели: `IntersectionObserver` — видимость, `ResizeObserver` — размер, `MutationObserver` — изменения дерева.
- Анимации — CSS-переходами по классу; `requestAnimationFrame` — для покадровых вычислений; учитывайте `prefers-reduced-motion`.
- Не чередуйте чтение размеров и запись стилей; анимируйте `transform` и `opacity`.
- Правильные элементы (`button`, `a`, `label`, `dialog`) и ARIA-атрибуты делают страницу доступной.
- Чужие данные — только через `textContent` и безопасные свойства.

**Проверьте себя:**

1. Почему `fetch` не попадает в `catch` при ответе сервера 404?
2. Какая проблема возникает при поиске по мере ввода без отмены предыдущих запросов?
3. Почему цикл «прочитал `offsetHeight` — записал `style.height`» медленный?
4. Чем `<button>` лучше `<div>` с обработчиком `click`?
5. Почему `link.href = userInput` может быть опасным?

Последняя часть — ES-модули и итоговый пример, где всё собрано вместе.
