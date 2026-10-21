# Теория DOM. Часть 8. ES-модули и итоговый пример

Пока скрипт небольшой, его можно держать в одном файле. Когда кода становится сотни строк, один файл превращается в свалку: функции работы с сервером, хранилищем, отрисовкой и обработчики перемешаны, а все переменные видны всем. **ES-модули** позволяют разделить код на файлы, у каждого из которых своя задача. В конце части — итоговое приложение «Каталог книг», в котором собраны приёмы всех восьми частей.

---

## 1. Что такое модуль

Модуль — это файл JavaScript, который:

- **явно экспортирует** то, что разрешено использовать снаружи (`export`);
- **явно импортирует** то, что ему нужно из других модулей (`import`);
- имеет **свою область видимости**: переменные модуля не попадают в глобальную область и не конфликтуют с переменными других файлов.

```js
// math.js — модуль с функциями
export const VAT = 0.12;                 // именованный экспорт константы

export function withVat(price) {         // именованный экспорт функции
  return Math.round(price * (1 + VAT));
}

function secret() {}                     // без export — снаружи недоступна
```

```js
// main.js — использует модуль
import { withVat, VAT } from "./math.js"; // путь с ./ и расширением .js обязателен

console.log(withVat(1000)); // 1120
console.log(VAT);           // 0.12
// secret(); — ReferenceError: функция не экспортирована
```

## 2. Подключение на странице

```html
<!-- type="module" включает модули. Подключается только «точка входа»,
     остальные файлы браузер загрузит сам по цепочке import. -->
<script type="module" src="js/main.js"></script>
```

Что меняет `type="module"`:

| Свойство | Обычный скрипт | Модуль |
|---|---|---|
| Когда выполняется | Сразу (если нет `defer`) | Отложенно, как `defer` — после разбора HTML |
| Область видимости | Глобальная | Своя у каждого файла |
| Строгий режим | Только с `"use strict"` | Всегда |
| `this` на верхнем уровне | `window` | `undefined` |
| Сколько раз выполняется | При каждом подключении | **Один раз**, даже если импортирован из многих файлов |
| Открытие через `file://` | Работает | **Не работает** — нужен локальный сервер |

> **Важно для практики.** Браузер не загружает модули со страницы, открытой двойным щелчком (`file:///…/index.html`) — в консоли будет ошибка CORS. Запустите локальный сервер в папке проекта, например:
>
> - расширение **Live Server** в VS Code (кнопка *Go Live*);
> - или в терминале: `python -m http.server 8000` и откройте `http://localhost:8000`.

## 3. Виды экспорта и импорта

```js
// ---- Именованный экспорт: сколько угодно на файл ----
export function formatPrice(n) { return `${n.toLocaleString("ru-RU")} сум`; }
export const CURRENCY = "UZS";

// Можно экспортировать списком в конце файла
function a() {}
function b() {}
export { a, b as renamedB };

// ---- Экспорт по умолчанию: один на файл ----
export default function createCard(book) { /* … */ }
```

```js
// Именованный импорт — имена в фигурных скобках, как при экспорте
import { formatPrice, CURRENCY } from "./format.js";

// Переименование при импорте
import { formatPrice as price } from "./format.js";

// Импорт по умолчанию — имя выбираете сами, без скобок
import createCard from "./card.js";

// Всё содержимое модуля как объект
import * as format from "./format.js";
format.formatPrice(100);

// Динамический импорт: модуль загружается только когда понадобится
button.addEventListener("click", async () => {
  const { openEditor } = await import("./editor.js"); // загрузка по требованию
  openEditor();
});
```

Импорты **только для чтения**: `import { CURRENCY } …; CURRENCY = "USD"` вызовет ошибку. Но если экспортирован объект, его поля менять можно — все модули видят **один и тот же** объект. На этом построен модуль состояния в итоговом примере.

## 4. Как делить код на модули

Хорошее правило: **у каждого модуля одна причина для изменения**.

| Модуль | Отвечает за | Знает про DOM? |
|---|---|---|
| `api.js` | Запросы к серверу | Нет |
| `storage.js` | Сохранение в `localStorage` | Нет |
| `state.js` | Данные приложения и их изменение | Нет |
| `view.js` | Построение элементов по данным | Да |
| `main.js` | Точка входа: находит элементы, связывает события, состояние и отрисовку | Да |

Модули без DOM можно проверять отдельно от страницы, а внешний вид можно переделать, не трогая логику.

---

## 5. Итоговый пример: «Каталог книг»

Что умеет приложение:

- загружает список книг из `data/books.json` и показывает состояния «загрузка» и «ошибка»;
- фильтрует книги по жанру (кнопки строятся из данных) и по названию или автору;
- отмечает книги избранными и помнит выбор после перезагрузки (`localStorage`);
- показывает подробности книги в модальном окне `<dialog>`;
- обновляет адрес страницы при смене жанра, чтобы ссылку можно было отправить.

Структура проекта:

```text
catalog/
├── index.html
├── css/
│   └── style.css
├── data/
│   └── books.json
└── js/
    ├── main.js      ← точка входа
    ├── api.js       ← загрузка данных
    ├── storage.js   ← избранное в localStorage
    ├── state.js     ← состояние и подписка на изменения
    └── view.js      ← карточки, кнопки жанров, окно
```

### `index.html`

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Каталог книг</title>
  <link rel="stylesheet" href="css/style.css">
  <!-- Подключаем только точку входа; модуль выполнится после разбора HTML -->
  <script type="module" src="js/main.js"></script>
</head>
<body>
  <header class="header">
    <h1>Каталог книг</h1>
    <!-- Счётчик избранного обновляется скриптом -->
    <p class="header__fav">Избранное: <span id="fav-count">0</span></p>
  </header>

  <main class="layout">
    <!-- Панель фильтров -->
    <section class="filters" aria-label="Фильтры">
      <label class="filters__search">
        Поиск
        <input id="search" type="search" placeholder="Название или автор" autocomplete="off">
      </label>
      <!-- Кнопки жанров строятся из данных -->
      <div class="filters__genres" id="genres" role="group" aria-label="Жанр"></div>
    </section>

    <!-- Сообщения: загрузка, ошибка, «ничего не найдено». role="status" — диктор озвучит -->
    <p class="message" id="message" role="status"></p>

    <!-- Сюда попадают карточки -->
    <ul class="cards" id="cards"></ul>
  </main>

  <!-- Шаблон карточки: не отображается, копируется скриптом -->
  <template id="card-template">
    <li class="card">
      <img class="card__cover" alt="" width="120" height="180" loading="lazy">
      <div class="card__body">
        <h2 class="card__title"></h2>
        <p class="card__author"></p>
        <p class="card__meta"></p>
        <div class="card__actions">
          <button class="card__more" type="button">Подробнее</button>
          <button class="card__fav" type="button" aria-pressed="false">☆ В избранное</button>
        </div>
      </div>
    </li>
  </template>

  <!-- Модальное окно с подробностями -->
  <dialog class="dialog" id="book-dialog" aria-labelledby="dialog-title">
    <h2 class="dialog__title" id="dialog-title"></h2>
    <p class="dialog__author"></p>
    <p class="dialog__description"></p>
    <form method="dialog">
      <!-- form method="dialog": нажатие кнопки закрывает окно без JavaScript -->
      <button class="dialog__close" type="submit">Закрыть</button>
    </form>
  </dialog>
</body>
</html>
```

### `css/style.css`

```css
/* Только необходимое для примера */
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; color: #1f2937; background: #f9fafb; }
[hidden] { display: none !important; }   /* hidden всегда сильнее display из других правил */

.header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: #fff; border-bottom: 1px solid #e5e7eb; }
.layout { max-width: 1000px; margin: 0 auto; padding: 16px; }

.filters { display: flex; flex-wrap: wrap; gap: 16px; align-items: end; margin-bottom: 16px; }
.filters__search { display: grid; gap: 4px; }
.filters__search input { padding: 8px; min-width: 240px; }
.filters__genres { display: flex; flex-wrap: wrap; gap: 8px; }

.chip { padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 999px; background: #fff; cursor: pointer; }
.chip[aria-pressed="true"] { background: #2563eb; border-color: #2563eb; color: #fff; } /* выбранный жанр */

.cards { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.card { display: flex; gap: 12px; padding: 12px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; transition: box-shadow 0.2s; }
.card--fav { border-color: #f59e0b; box-shadow: 0 0 0 2px #fde68a; }
.card__cover { object-fit: cover; border-radius: 4px; background: #e5e7eb; }
.card__title { font-size: 1.05rem; margin: 0 0 4px; }
.card__author, .card__meta { margin: 0 0 4px; color: #6b7280; }
.card__actions { display: flex; gap: 8px; margin-top: 8px; }

.message:empty { display: none; }        /* пустое сообщение не занимает места */
.message--error { color: #b91c1c; }

.dialog { max-width: 480px; border: none; border-radius: 8px; padding: 24px; }
.dialog::backdrop { background: rgb(0 0 0 / 0.4); } /* затемнение страницы за окном */

:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; } /* заметный фокус с клавиатуры */
```

### `data/books.json`

```json
[
  { "id": 1, "title": "Мастер и Маргарита", "author": "М. А. Булгаков", "year": 1967, "genre": "Роман",
    "cover": "https://placehold.co/120x180?text=1", "description": "Сатана со свитой посещает Москву 1930-х годов." },
  { "id": 2, "title": "Тихий Дон", "author": "М. А. Шолохов", "year": 1940, "genre": "Роман",
    "cover": "https://placehold.co/120x180?text=2", "description": "Судьба донского казачества в годы войн и революции." },
  { "id": 3, "title": "Евгений Онегин", "author": "А. С. Пушкин", "year": 1833, "genre": "Поэзия",
    "cover": "https://placehold.co/120x180?text=3", "description": "Роман в стихах о любви и выборе." },
  { "id": 4, "title": "Мцыри", "author": "М. Ю. Лермонтов", "year": 1840, "genre": "Поэзия",
    "cover": "https://placehold.co/120x180?text=4", "description": "Поэма о юноше, мечтающем о свободе." },
  { "id": 5, "title": "Вишнёвый сад", "author": "А. П. Чехов", "year": 1904, "genre": "Пьеса",
    "cover": "https://placehold.co/120x180?text=5", "description": "Последняя пьеса Чехова о смене эпох." }
]
```

(Если в классе нет интернета, картинки не загрузятся — карточки всё равно работают; можно положить свои обложки в папку `covers/`.)

### `js/api.js` — загрузка данных

```js
// Модуль работы с сервером. Ничего не знает о DOM: только получает и проверяет данные.

const BOOKS_URL = "data/books.json";

// Загружает список книг. Возвращает Promise с массивом или выбрасывает ошибку.
export async function fetchBooks() {
  const response = await fetch(BOOKS_URL);

  // fetch не считает 404/500 ошибкой — проверяем код ответа сами
  if (!response.ok) {
    throw new Error(`не удалось получить данные (код ${response.status})`);
  }

  const data = await response.json();

  // Проверяем форму данных: сервер мог вернуть не то, что ожидаем
  if (!Array.isArray(data)) throw new Error("неверный формат данных");

  // Оставляем только корректные записи и приводим поля к нужным типам
  return data
    .filter((b) => Number.isInteger(b.id) && typeof b.title === "string")
    .map((b) => ({
      id: b.id,
      title: b.title,
      author: String(b.author || "Автор неизвестен"),
      year: Number(b.year) || null,
      genre: String(b.genre || "Без жанра"),
      cover: String(b.cover || ""),
      description: String(b.description || ""),
    }));
}
```

### `js/storage.js` — избранное в `localStorage`

```js
// Модуль хранения. Скрывает от остального кода, ГДЕ и КАК хранятся данные:
// если завтра избранное переедет на сервер, поменяется только этот файл.

const KEY = "catalog:favorites:v1";

// Читает избранное. Любая проблема (нет данных, мусор, хранилище запрещено) → пустой набор.
export function loadFavorites() {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY) || "[]");
    return new Set(Array.isArray(ids) ? ids.filter(Number.isInteger) : []);
  } catch {
    return new Set();
  }
}

// Сохраняет избранное. Ошибка записи не должна ломать страницу.
export function saveFavorites(favorites) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...favorites]));
  } catch (error) {
    console.warn("Избранное не сохранено:", error);
  }
}

export const FAVORITES_KEY = KEY; // нужен main.js, чтобы слушать изменения из других вкладок
```

### `js/state.js` — состояние и подписка

```js
// Модуль состояния: данные приложения и единственный способ их менять.
// Сам ничего не рисует — сообщает подписчикам, что состояние изменилось.

import { loadFavorites, saveFavorites } from "./storage.js";

// Объект состояния. Экспортируется для ЧТЕНИЯ; менять — только через функции ниже.
export const state = {
  books: [],               // все книги
  status: "loading",       // "loading" | "ready" | "error"
  error: "",               // текст ошибки
  genre: "all",            // выбранный жанр
  query: "",               // строка поиска
  favorites: loadFavorites(), // Set с id избранных книг
};

// Подписчики — функции, которые вызываются после каждого изменения
const listeners = new Set();

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener); // функция отписки
}

// Применить изменения и оповестить подписчиков
export function update(changes) {
  Object.assign(state, changes);
  listeners.forEach((listener) => listener(state));
}

// --- Действия: каждое описывает ОДНО изменение предметной области ---

export function toggleFavorite(id) {
  const favorites = new Set(state.favorites); // новый Set, старый не меняем
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  saveFavorites(favorites);
  update({ favorites });
}

// --- Производные данные: вычисляются из состояния, нигде не хранятся ---

// Список жанров без повторов, по алфавиту
export function genresOf(books) {
  return [...new Set(books.map((b) => b.genre))].sort((a, b) => a.localeCompare(b, "ru"));
}

// Книги, которые нужно показать при текущих фильтрах
export function visibleBooks() {
  const q = state.query.trim().toLowerCase();
  return state.books.filter((book) => {
    const genreOk = state.genre === "all" || book.genre === state.genre;
    const queryOk = !q || book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q);
    return genreOk && queryOk;
  });
}
```

### `js/view.js` — построение элементов

```js
// Модуль отображения: превращает данные в элементы DOM.
// Не меняет состояние и не вешает обработчики — только строит и заполняет элементы.

const cardTemplate = document.getElementById("card-template");

// Карточка книги из шаблона. Все данные — через textContent и свойства (безопасно).
export function createCard(book, isFavorite) {
  const card = cardTemplate.content.firstElementChild.cloneNode(true);
  card.dataset.id = book.id;                  // по id обработчик найдёт книгу

  const cover = card.querySelector(".card__cover");
  if (book.cover) {
    cover.src = book.cover;
    cover.alt = `Обложка книги «${book.title}»`;
  } else {
    cover.hidden = true;                      // нет обложки — не показываем пустой блок
  }

  card.querySelector(".card__title").textContent = book.title;
  card.querySelector(".card__author").textContent = book.author;
  card.querySelector(".card__meta").textContent = [book.genre, book.year].filter(Boolean).join(" · ");

  setFavorite(card, isFavorite);
  return card;
}

// Внешний вид «избранности» — отдельно, чтобы обновлять карточку без пересоздания
export function setFavorite(card, isFavorite) {
  card.classList.toggle("card--fav", isFavorite);
  const button = card.querySelector(".card__fav");
  button.setAttribute("aria-pressed", String(isFavorite)); // для диктора и для CSS
  button.textContent = isFavorite ? "★ В избранном" : "☆ В избранное";
}

// Кнопки жанров: «Все» + по одной на жанр
export function createGenreButtons(genres, selected) {
  return ["all", ...genres].map((genre) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.dataset.genre = genre;
    button.textContent = genre === "all" ? "Все" : genre;
    button.setAttribute("aria-pressed", String(genre === selected));
    return button;
  });
}

// Заполняет и открывает модальное окно
export function openDialog(dialog, book) {
  dialog.querySelector(".dialog__title").textContent = book.title;
  dialog.querySelector(".dialog__author").textContent = `${book.author}${book.year ? ", " + book.year : ""}`;
  dialog.querySelector(".dialog__description").textContent = book.description || "Описания пока нет.";
  dialog.showModal(); // модальный режим: фон заблокирован, Escape закрывает
}
```

### `js/main.js` — точка входа

```js
// Точка входа: находит элементы, связывает события с действиями,
// а изменения состояния — с отрисовкой.

import { fetchBooks } from "./api.js";
import { FAVORITES_KEY, loadFavorites } from "./storage.js";
import { state, update, subscribe, toggleFavorite, genresOf, visibleBooks } from "./state.js";
import { createCard, setFavorite, createGenreButtons, openDialog } from "./view.js";

// ---------- 1. Элементы страницы — находим один раз ----------
const cardsEl = document.getElementById("cards");
const genresEl = document.getElementById("genres");
const searchEl = document.getElementById("search");
const messageEl = document.getElementById("message");
const favCountEl = document.getElementById("fav-count");
const dialogEl = document.getElementById("book-dialog");

// ---------- 2. Отрисовка ----------

// Карточки уже на странице: id → элемент. Позволяет обновлять, а не пересоздавать.
const cardNodes = new Map();

function render() {
  // Сообщение о состоянии загрузки
  messageEl.classList.toggle("message--error", state.status === "error");
  if (state.status === "loading") messageEl.textContent = "Загрузка каталога…";
  else if (state.status === "error") messageEl.textContent = `Ошибка: ${state.error}`;

  cardsEl.setAttribute("aria-busy", String(state.status === "loading"));
  favCountEl.textContent = state.favorites.size;

  if (state.status !== "ready") return;

  // Кнопки жанров создаём один раз, при первой отрисовке с данными.
  // Потом только отмечаем выбранную: если пересоздавать кнопки, после щелчка
  // пропадёт фокус (нажатой кнопки больше нет в DOM).
  if (!genresEl.children.length) {
    genresEl.append(...createGenreButtons(genresOf(state.books), state.genre));
  }
  for (const chip of genresEl.children) {
    chip.setAttribute("aria-pressed", String(chip.dataset.genre === state.genre));
  }

  // Карточки: создаём недостающие, обновляем существующие
  const books = visibleBooks();
  const nodes = books.map((book) => {
    let card = cardNodes.get(book.id);
    if (!card) {
      card = createCard(book, state.favorites.has(book.id));
      cardNodes.set(book.id, card);
    } else {
      setFavorite(card, state.favorites.has(book.id));
    }
    return card;
  });
  // Набор или порядок карточек изменился (фильтр, поиск) — ставим нужные.
  // replaceChildren с ТЕМИ ЖЕ элементами переставляет их, а не пересоздаёт:
  // картинки не загружаются заново. Но вынутый из дерева элемент теряет фокус,
  // поэтому если карточки те же и в том же порядке (нажали «В избранное»),
  // список не трогаем — фокус остаётся на нажатой кнопке.
  const children = cardsEl.children;
  const same = nodes.length === children.length && nodes.every((node, i) => children[i] === node);
  if (!same) cardsEl.replaceChildren(...nodes);

  messageEl.textContent = books.length ? "" : "Ничего не найдено. Измените фильтр или строку поиска.";
}

// Каждый раз, когда состояние меняется, экран обновляется
subscribe(render);

// ---------- 3. События: только меняют состояние, ничего не рисуют ----------

// Делегирование: один обработчик на все карточки (и на те, что появятся позже)
cardsEl.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const id = Number(button.closest(".card").dataset.id);

  if (button.matches(".card__fav")) {
    toggleFavorite(id);
  } else if (button.matches(".card__more")) {
    const book = state.books.find((b) => b.id === id);
    if (book) openDialog(dialogEl, book);
  }
});

// Делегирование для кнопок жанров
genresEl.addEventListener("click", (event) => {
  const chip = event.target.closest(".chip");
  if (!chip) return;
  update({ genre: chip.dataset.genre });
  // Запоминаем жанр в адресе: ?genre=Поэзия. replaceState не перезагружает страницу.
  const url = new URL(location.href);
  if (chip.dataset.genre === "all") url.searchParams.delete("genre");
  else url.searchParams.set("genre", chip.dataset.genre);
  history.replaceState(null, "", url);
});

// Поиск по мере ввода с задержкой: фильтруем, когда пользователь перестал печатать
let searchTimer = null;
searchEl.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => update({ query: searchEl.value }), 200);
});

// Избранное поменяли в другой вкладке — подтягиваем
window.addEventListener("storage", (event) => {
  if (event.key === FAVORITES_KEY) update({ favorites: loadFavorites() });
});

// ---------- 4. Запуск ----------

async function start() {
  // Жанр из адреса страницы, если он там есть
  const genreFromUrl = new URL(location.href).searchParams.get("genre");
  update({ status: "loading", genre: genreFromUrl || "all" });

  try {
    const books = await fetchBooks();
    // Жанра из адреса нет в данных — показываем все
    const genre = state.genre === "all" || books.some((b) => b.genre === state.genre) ? state.genre : "all";
    update({ books, genre, status: "ready" });
  } catch (error) {
    update({ status: "error", error: error.message });
  }
}

start();
```

## 6. Как работает приложение: по шагам

**Загрузка страницы.**

1. Браузер разбирает `index.html`, строит DOM. Скрипт-модуль загружается параллельно, но ждёт.
2. HTML разобран — выполняется `main.js`. Перед этим браузер по цепочке `import` загружает `api.js`, `storage.js`, `state.js`, `view.js` и выполняет каждый **один раз** (`storage.js` импортируют двое, но выполнится он один раз).
3. При выполнении `state.js` создаётся объект `state`, в нём — избранное из `localStorage`.
4. `main.js` находит элементы, подписывает `render` на изменения и вешает обработчики.
5. `start()` ставит `status: "loading"` → `render` показывает «Загрузка каталога…».
6. `fetchBooks()` запрашивает JSON. Пока ждём ответ, страница отзывчива.
7. Ответ пришёл → `update({ books, status: "ready" })` → `render` строит кнопки жанров и карточки.

**Щелчок «☆ В избранное».**

1. Событие `click` возникает на кнопке и всплывает до `<ul id="cards">`.
2. Обработчик через `closest` находит кнопку и карточку, берёт `data-id`.
3. `toggleFavorite(id)` создаёт новый набор избранного, сохраняет его в `localStorage` и вызывает `update`.
4. `update` вызывает `render`. Карточка уже есть в `cardNodes` — она **не пересоздаётся**, `setFavorite` меняет только класс, `aria-pressed` и текст кнопки. Фокус остаётся на кнопке.

**Ввод в поиск.**

1. Каждая буква вызывает `input`, но таймер откладывает обновление на 200 мс после последней.
2. `update({ query })` → `render` → `visibleBooks()` возвращает подходящие книги, `replaceChildren` показывает только их (те же элементы, в нужном порядке).

**Ошибка сети.** `fetchBooks` выбрасывает ошибку → `catch` в `start` → `status: "error"` → `render` показывает сообщение красным. Остальная страница работает.

## 7. Как развивать пример (для самостоятельной практики)

Попробуйте добавить, опираясь на материал частей 1–8:

1. Фильтр «Только избранное» (флажок) — новое поле в `state` и условие в `visibleBooks`.
2. Сохранение строки поиска в адресе страницы, как сделано для жанра.
3. Ленивую подгрузку: показывать по 20 книг и догружать следующие через `IntersectionObserver` (часть 7).
4. Уведомление «Добавлено в избранное», которое плавно появляется и исчезает (часть 7, анимации).
5. Форму «Предложить книгу» с проверкой полей (часть 6), которая добавляет книгу в `state.books`.

## 8. Шпаргалка по всем частям

| Тема | Главное |
|---|---|
| Подключение | `<script defer>` или `<script type="module">` |
| Поиск | `querySelector`, `querySelectorAll`, `closest`, `matches` |
| Обход | `parentElement`, `children`, `next/previousElementSibling` |
| Текст | `textContent` (безопасно), `innerHTML` (только своя разметка) |
| Атрибуты | `getAttribute`/`setAttribute`, свойства, `dataset` |
| Классы и стили | `classList`, CSS-переменные через `style.setProperty` |
| Создание | `createElement`, `<template>` + `cloneNode(true)` |
| Вставка | `append`, `prepend`, `before`, `after`, `replaceChildren` |
| События | `addEventListener`, всплытие, делегирование, `preventDefault` |
| Формы | `form.elements`, `FormData`, `validity`, `setCustomValidity` |
| Данные | состояние → `render()`; `fetch` + `try/catch`; `localStorage` + JSON |
| Наблюдатели | `IntersectionObserver`, `ResizeObserver`, `MutationObserver` |
| Скорость | пачками, без чередования чтения размеров и записи стилей |
| Доступность | `button`, `label`, `dialog`, `aria-*`, видимый фокус |
| Безопасность | чужие данные — только `textContent`; проверка ссылок |
| Модули | `export` / `import`, один модуль — одна задача, нужен локальный сервер |

**Проверьте себя:**

1. Почему страница с модулями не работает, если открыть её двойным щелчком по файлу?
2. Сколько раз выполнится `storage.js` в итоговом примере и почему?
3. Почему обработчики событий в `main.js` только меняют состояние, а не трогают DOM сами?
4. Что произойдёт с карточкой при нажатии «В избранное» — пересоздастся ли она?
5. В каком модуле нужно поменять код, если избранное будет храниться на сервере?
