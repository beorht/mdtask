# Теория DOM. Часть 4. Создание, вставка и удаление элементов

Динамические страницы постоянно меняют своё дерево: добавляют карточки, убирают уведомления, переставляют элементы. В этой части — все способы это сделать, от простого `createElement` до шаблонов `<template>` и отрисовки большого числа элементов за один раз.

Разметка для примеров:

```html
<section class="shelf">
  <h2>Полка</h2>
  <div class="shelf__items" id="items">
    <article class="book">Мастер и Маргарита</article>
    <article class="book">Тихий Дон</article>
  </div>
</section>
```

---

## 1. Создание элемента

```js
// 1. Создаём элемент. Он существует только в памяти — на странице его нет.
const book = document.createElement("article");

// 2. Настраиваем его: классы, атрибуты, текст
book.className = "book book--new";
book.dataset.id = "3";
book.textContent = "Евгений Онегин";

// 3. Вставляем в дерево — только теперь элемент появляется на экране
document.getElementById("items").append(book);
```

Как выполняется: `createElement` создаёт «оторванный» от документа объект. Изменения такого элемента ничего не стоят — браузеру нечего перерисовывать. Пересчёт раскладки и отрисовка начинаются только после вставки в документ. Поэтому **сначала полностью настройте элемент, потом вставляйте**.

Другие способы создать узел:

```js
document.createTextNode("просто текст"); // текстовый узел
document.createComment("метка");        // комментарий
document.createDocumentFragment();      // «контейнер без тега» (раздел 6)
```

### Небольшая функция-помощник

Когда элементов много, удобно завести функцию, которая создаёт элемент с классом и текстом за один вызов:

```js
// Создаёт элемент: el("p", "card__author", "А. С. Пушкин")
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text; // textContent — безопасно для любых данных
  return node;
}

const author = el("p", "card__author", "А. С. Пушкин");
```

## 2. Куда вставить: современные методы

Пусть `items` — контейнер, `ref` — один из элементов внутри него.

```js
const items = document.getElementById("items");
const ref = items.firstElementChild; // "Мастер и Маргарита"

items.append(node);   // в КОНЕЦ контейнера (последним ребёнком)
items.prepend(node);  // в НАЧАЛО контейнера (первым ребёнком)
ref.before(node);     // ПЕРЕД ref (соседом слева)
ref.after(node);      // ПОСЛЕ ref (соседом справа)
ref.replaceWith(node);// ВМЕСТО ref (ref удаляется из дерева)
```

Схема для `ref`:

```text
<div id="items">
    ← items.prepend(node)
    ← ref.before(node)
  <article>ref</article>    ← ref.replaceWith(node) заменит его
    ← ref.after(node)
  <article>Тихий Дон</article>
    ← items.append(node)
</div>
```

Особенности этих методов:

```js
// Можно передать несколько узлов и строк за раз.
// Строки вставляются как ТЕКСТ (не как HTML) — это безопасно.
items.append(bookA, bookB, "и ещё текст");

// Можно передать массив через оператор расширения
const nodes = [bookA, bookB, bookC];
items.append(...nodes);
```

В старом коде встречаются `parent.appendChild(node)` и `parent.insertBefore(node, ref)`. Они делают то же самое, но принимают только один узел и не принимают строки.

## 3. Вставка рядом с HTML: `insertAdjacentHTML` и `insertAdjacentElement`

Эти методы вставляют относительно элемента в одну из четырёх позиций:

```text
<!-- beforebegin -->
<div id="items">
  <!-- afterbegin -->
  …содержимое…
  <!-- beforeend -->
</div>
<!-- afterend -->
```

```js
// Вставить готовую разметку в конец, НЕ трогая существующих детей
items.insertAdjacentHTML("beforeend", '<article class="book">Война и мир</article>');

// Вставить элемент перед контейнером
items.insertAdjacentElement("beforebegin", noticeElement);

// Вставить текст (как текст, без разбора HTML)
items.insertAdjacentText("afterbegin", "Книги на полке:");
```

Почему `insertAdjacentHTML("beforeend", …)` лучше, чем `items.innerHTML += …`:

```js
// ❌ innerHTML += … : браузер берёт ВСЮ старую разметку строкой, приклеивает новую
// и разбирает всё заново. Старые элементы уничтожаются и создаются снова —
// их обработчики событий и введённый текст в полях пропадают.
items.innerHTML += '<article class="book">Новая</article>';

// ✅ insertAdjacentHTML разбирает ТОЛЬКО новую строку и добавляет результат.
// Старые элементы не трогаются.
items.insertAdjacentHTML("beforeend", '<article class="book">Новая</article>');
```

Правило безопасности то же, что для `innerHTML`: только ваша собственная разметка, без данных пользователя.

## 4. Перемещение элемента

Узел может находиться в дереве **только в одном месте**. Если вставить элемент, который уже есть на странице, он **переместится**, а не скопируется:

```js
const items = document.getElementById("items");
const first = items.firstElementChild;

// Первая книга переедет в конец списка — копии не появится
items.append(first);
```

На этом построена перестановка элементов: например, чтобы упорядочить карточки, достаточно вставить их заново в нужном порядке.

```js
// Расставляем книги по алфавиту, переставляя существующие элементы
const books = [...items.children]; // массив элементов (снимок)

books
  .sort((a, b) => a.textContent.localeCompare(b.textContent, "ru")) // сравнение строк по-русски
  .forEach((book) => items.append(book)); // каждая книга по очереди уезжает в конец
```

Элементы при этом не пересоздаются — их обработчики и состояние сохраняются.

## 5. Копирование: `cloneNode`

```js
const original = items.firstElementChild;

const shallow = original.cloneNode();   // только сам тег с атрибутами, БЕЗ детей
const deep = original.cloneNode(true);  // тег со всем содержимым

deep.textContent = "Копия";
items.append(deep);
```

Обратите внимание:

- обработчики, добавленные через `addEventListener`, **не копируются**;
- копия получает тот же `id` — если он есть, поменяйте его, иначе на странице будет два одинаковых id.

## 6. `DocumentFragment` — вставка многих элементов за раз

Если вставлять 500 элементов по одному в документ, браузер может много раз пересчитывать страницу. Фрагмент — это «контейнер без тега»: собираете элементы в нём, а потом вставляете одним действием.

```js
const titles = ["Обломов", "Отцы и дети", "Белые ночи", "Мёртвые души"];

const fragment = document.createDocumentFragment(); // контейнер в памяти

for (const title of titles) {
  const book = document.createElement("article");
  book.className = "book";
  book.textContent = title;
  fragment.append(book); // вставка во фрагмент — страница не меняется
}

// Одна вставка: все дети фрагмента переезжают в items, фрагмент становится пустым
items.append(fragment);
```

Тот же эффект даёт `items.append(...arrayOfElements)` — одна операция вставки. В современных браузерах обе записи работают быстро; главное — **не читать размеры элементов между вставками** (см. часть 7).

## 7. Шаблоны: тег `<template>`

Когда у элемента сложная структура (карточка с картинкой, заголовком, кнопками), собирать её через десяток `createElement` неудобно. Тег `<template>` хранит разметку, которую браузер **не показывает** и не выполняет, пока вы её не скопируете.

```html
<!-- Шаблон карточки. Невидим, картинки из него не загружаются -->
<template id="book-card">
  <article class="card">
    <img class="card__cover" alt="">
    <h3 class="card__title"></h3>
    <p class="card__author"></p>
    <button class="card__fav" type="button">В избранное</button>
  </article>
</template>

<div class="cards" id="cards"></div>
```

```js
const template = document.getElementById("book-card");
const cards = document.getElementById("cards");

// Данные — массив объектов (могли прийти с сервера)
const books = [
  { id: 1, title: "Мастер и Маргарита", author: "М. А. Булгаков", cover: "covers/1.jpg" },
  { id: 2, title: "Тихий Дон", author: "М. А. Шолохов", cover: "covers/2.jpg" },
];

function createCard(book) {
  // template.content — DocumentFragment с содержимым шаблона.
  // cloneNode(true) делает глубокую копию; firstElementChild — сам <article>.
  const card = template.content.cloneNode(true).firstElementChild;

  // Заполняем копию. textContent и свойства — безопасно для любых данных.
  card.dataset.id = book.id;
  card.querySelector(".card__title").textContent = book.title;
  card.querySelector(".card__author").textContent = book.author;
  const img = card.querySelector(".card__cover");
  img.src = book.cover;
  img.alt = `Обложка: ${book.title}`;

  return card;
}

// map создаёт массив карточек, append вставляет их все за одну операцию
cards.append(...books.map(createCard));
```

Как выполняется: при загрузке браузер разбирает содержимое `<template>` в отдельный фрагмент, который не входит в документ. `cloneNode(true)` копирует этот фрагмент; копия — обычные элементы, которые можно заполнить и вставить. Разметка остаётся в HTML, данные заполняются безопасно.

## 8. Удаление и замена

```js
const book = items.firstElementChild;

book.remove();                 // удалить элемент из дерева

items.replaceChildren();       // удалить ВСЕХ детей (очистить контейнер)
items.replaceChildren(a, b);   // заменить всех детей на новые узлы

items.textContent = "";        // тоже очищает контейнер (старый, но рабочий приём)

// Старый способ: через родителя
book.parentElement.removeChild(book);
```

Удалённый элемент остаётся в переменной и его можно вставить обратно (`items.append(book)`). Память освободится, когда на элемент не останется ссылок.

## 9. Отрисовка из данных: главный приём

Во всех примерах выше мы меняли DOM «точечно». Когда данных много и они меняются часто, точечные изменения легко запутать: что-то забыли обновить — и экран расходится с данными. Надёжный подход:

1. **Данные** хранятся в обычном массиве или объекте JavaScript.
2. Функция `render()` **полностью строит** нужную часть страницы по этим данным.
3. После каждого изменения данных вызывается `render()`.

```js
// Данные — единственный источник правды
const shelf = [
  { id: 1, title: "Обломов", read: false },
  { id: 2, title: "Белые ночи", read: true },
];

const container = document.getElementById("items");
const counter = document.getElementById("counter");

// Строит содержимое контейнера по массиву. Ничего не «помнит» о прошлом экране.
function render() {
  const nodes = shelf.map((book) => {
    const node = document.createElement("article");
    node.className = "book";
    node.classList.toggle("book--read", book.read); // класс зависит от данных
    node.dataset.id = book.id;
    node.textContent = book.title;
    return node;
  });

  container.replaceChildren(...nodes); // старое содержимое заменяется новым за одну операцию
  counter.textContent = `Прочитано: ${shelf.filter((b) => b.read).length} из ${shelf.length}`;
}

// Изменение данных → перерисовка
function markRead(id) {
  const book = shelf.find((b) => b.id === id);
  book.read = true;
  render();
}

render(); // первая отрисовка
```

Плюсы: экран всегда соответствует данным, код изменения данных не думает о DOM. Минус: при каждом изменении элементы пересоздаются. Для сотен элементов это незаметно; для очень больших списков или полей ввода внутри списка применяют более точечные обновления — об этом в части 7.

## 10. Частые ошибки

- **Элемент создан, но не виден** — забыли вставить его в документ (`append`).
- **Вставили один элемент дважды, а на странице он один** — элемент перемещается, а не копируется. Нужна копия — `cloneNode(true)` или новый `createElement`.
- **После `innerHTML +=` перестали работать кнопки** — старые элементы пересоздались без обработчиков. Используйте `append` / `insertAdjacentHTML` или делегирование событий (часть 5).
- **Пропали элементы при удалении в цикле** по живой коллекции `children` — перебирайте копию: `[...container.children]`.
- **Два одинаковых id после `cloneNode`** — меняйте id копии или не используйте id в повторяющихся элементах (лучше классы и `data-*`).

**Проверьте себя:**

1. Что произойдёт, если вызвать `items.append(items.firstElementChild)`?
2. Почему содержимое `<template>` не видно на странице и картинки из него не загружаются?
3. Чем `container.replaceChildren(...nodes)` удобнее, чем удалять детей по одному?
4. Какие три части у подхода «отрисовка из данных»?

Следующая часть — события: как страница реагирует на действия пользователя.
