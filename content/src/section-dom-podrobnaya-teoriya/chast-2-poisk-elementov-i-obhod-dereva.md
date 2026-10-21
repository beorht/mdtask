# Теория DOM. Часть 2. Поиск элементов и обход дерева

Прежде чем что-то менять на странице, нужно найти нужный элемент. В этой части — все способы поиска, разница между «живыми» и «статичными» коллекциями и перемещение по дереву от элемента к его родителям, детям и соседям.

Все примеры этой части работают с такой разметкой:

```html
<main id="catalog">
  <h2 class="section-title">Книги</h2>

  <ul class="books">
    <li class="book" data-id="1" data-genre="роман">Мастер и Маргарита</li>
    <li class="book book--new" data-id="2" data-genre="роман">Тихий Дон</li>
    <li class="book" data-id="3" data-genre="поэзия">Евгений Онегин</li>
  </ul>

  <form id="search">
    <input type="search" name="query" placeholder="Название">
    <button type="submit">Найти</button>
  </form>
</main>
```

---

## 1. `getElementById` — поиск по id

```js
// Ищет элемент с атрибутом id="catalog" во всём документе.
// Решётка НЕ нужна: это не CSS-селектор, а просто значение id.
const catalog = document.getElementById("catalog");

console.log(catalog);                          // <main id="catalog">…</main>
console.log(document.getElementById("nope")); // null — такого id нет
```

`id` на странице должен быть **уникальным**. Если по ошибке у двух элементов одинаковый id, `getElementById` вернёт первый, а валидатор HTML покажет ошибку.

## 2. `querySelector` и `querySelectorAll` — поиск по CSS-селектору

Это самые универсальные методы: в них можно передать **любой** CSS-селектор — такой же, как в файле стилей.

```js
// querySelector возвращает ПЕРВЫЙ подходящий элемент (или null)
const firstBook = document.querySelector(".book");
console.log(firstBook.textContent); // "Мастер и Маргарита"

// querySelectorAll возвращает ВСЕ подходящие элементы — список NodeList
const books = document.querySelectorAll(".book");
console.log(books.length); // 3

// Перебор NodeList: у него есть forEach
books.forEach((book, index) => {
  console.log(index, book.textContent);
});

// Или цикл for...of
for (const book of books) {
  console.log(book.dataset.id);
}
```

Как выполняется `querySelector`: браузер обходит дерево **в порядке документа** (сверху вниз, сначала в глубину) и проверяет каждый элемент на соответствие селектору. Первый подошедший возвращается, обход прекращается. `querySelectorAll` проходит дерево до конца и собирает все совпадения.

### Примеры селекторов

```js
document.querySelector("#search");                 // по id
document.querySelector(".book--new");              // по классу
document.querySelector("li.book");                 // тег + класс
document.querySelectorAll(".books > li");          // прямые дети .books
document.querySelector("#search input");           // потомок формы
document.querySelectorAll('[data-genre="роман"]'); // по значению атрибута
document.querySelector('input[name="query"]');     // поле по name
document.querySelector(".book:last-child");        // псевдокласс
document.querySelectorAll(".book:not(.book--new)");// все, кроме новых
document.querySelectorAll("h2, .book");            // несколько селекторов сразу
```

### Поиск внутри элемента

Методы `querySelector`/`querySelectorAll` есть у **каждого** элемента, а не только у `document`. Тогда поиск идёт только среди потомков этого элемента — это быстрее и надёжнее.

```js
const form = document.getElementById("search");

// Ищем input только внутри формы, а не на всей странице
const input = form.querySelector("input");
const button = form.querySelector("button");
```

### NodeList — не массив

У `NodeList` есть `length`, `forEach` и доступ по индексу `books[0]`, но **нет** `map`, `filter`, `reduce`. Если они нужны — превратите список в массив:

```js
const books = document.querySelectorAll(".book");

// ❌ books.map is not a function
// const titles = books.map((b) => b.textContent);

// ✅ Array.from превращает NodeList в настоящий массив
const titles = Array.from(books).map((b) => b.textContent);

// ✅ Или оператор расширения
const novels = [...books].filter((b) => b.dataset.genre === "роман");

console.log(titles); // ["Мастер и Маргарита", "Тихий Дон", "Евгений Онегин"]
console.log(novels.length); // 2
```

## 3. Старые методы и «живые» коллекции

В старом коде встречаются ещё методы:

```js
document.getElementsByClassName("book"); // по классу
document.getElementsByTagName("li");     // по тегу
document.getElementsByName("query");     // по атрибуту name
```

Они возвращают **живую** коллекцию `HTMLCollection`: она **сама обновляется**, когда меняется DOM. А `querySelectorAll` возвращает **статичный** `NodeList` — снимок на момент вызова.

```js
const list = document.querySelector(".books");

const live = list.getElementsByClassName("book"); // живая
const snapshot = list.querySelectorAll(".book");  // статичная

console.log(live.length, snapshot.length); // 3 3

// Добавим ещё одну книгу
const li = document.createElement("li");
li.className = "book";
li.textContent = "Война и мир";
list.append(li);

console.log(live.length);     // 4 — коллекция обновилась сама
console.log(snapshot.length); // 3 — снимок остался прежним
```

Живые коллекции коварны в циклах: если в цикле удалять элементы, коллекция «сжимается» прямо во время перебора, и часть элементов пропускается. Поэтому в новом коде используйте `querySelectorAll`.

## 4. Проверка элемента: `matches` и `closest`

```js
const book = document.querySelector('[data-id="2"]');

// matches(селектор) — подходит ли САМ элемент под селектор
console.log(book.matches(".book--new"));    // true
console.log(book.matches("[data-genre]"));  // true
console.log(book.matches("h2"));            // false

// closest(селектор) — ближайший ПРЕДОК (или сам элемент), подходящий под селектор.
// Идёт вверх по дереву: элемент → родитель → родитель родителя → … → html.
console.log(book.closest("ul").className);  // "books"
console.log(book.closest("main").id);       // "catalog"
console.log(book.closest(".book") === book);// true — сам элемент тоже проверяется
console.log(book.closest("form"));          // null — формы среди предков нет
```

`closest` — один из самых полезных методов: в части 5 на нём построено делегирование событий («по какому пункту списка кликнули?»).

## 5. Перемещение по дереву

Найдя один элемент, можно перейти к соседним, не делая новый поиск.

### Только элементы (используйте их)

```js
const list = document.querySelector(".books");
const second = list.children[1]; // "Тихий Дон"

second.parentElement;          // <ul class="books">
second.previousElementSibling; // <li> "Мастер и Маргарита"
second.nextElementSibling;     // <li> "Евгений Онегин"

list.children;                 // HTMLCollection(3) — дети-элементы (живая)
list.childElementCount;        // 3
list.firstElementChild;        // первый <li>
list.lastElementChild;         // последний <li>

list.nextElementSibling;       // <form id="search"> — сосед ul
list.previousElementSibling;   // <h2> — предыдущий сосед

// У последнего ребёнка следующего соседа нет:
list.lastElementChild.nextElementSibling; // null
```

### Все узлы (включая текст и комментарии)

```js
list.childNodes;  // NodeList: текст "\n    ", li, текст, li, текст, li, текст
list.firstChild;  // текстовый узел с переносом строки и пробелами
list.lastChild;   // тоже текстовый узел
second.parentNode;
second.nextSibling;
```

Если вы удивились, почему `list.firstChild.textContent` — это пустая строка с переносом, вспомните часть 1: пробелы между тегами — тоже текстовые узлы.

### Сводная таблица

| Нужно | Все узлы | Только элементы |
|---|---|---|
| Родитель | `parentNode` | `parentElement` |
| Дети | `childNodes` | `children` |
| Первый / последний ребёнок | `firstChild` / `lastChild` | `firstElementChild` / `lastElementChild` |
| Соседи | `previousSibling` / `nextSibling` | `previousElementSibling` / `nextElementSibling` |

## 6. Обход всего поддерева

Иногда нужно пройти все элементы внутри блока, например, чтобы посчитать что-то. Простейший способ — рекурсия:

```js
// Печатает дерево элементов с отступами — как вкладка Elements в DevTools.
function printTree(element, depth = 0) {
  // "  ".repeat(depth) — отступ: два пробела на каждый уровень вложенности
  console.log("  ".repeat(depth) + element.tagName.toLowerCase());

  // Рекурсивно вызываем функцию для каждого ребёнка, увеличивая глубину
  for (const child of element.children) {
    printTree(child, depth + 1);
  }
}

printTree(document.getElementById("catalog"));
// main
//   h2
//   ul
//     li
//     li
//     li
//   form
//     input
//     button
```

Для обхода с фильтром в браузере есть встроенный инструмент `TreeWalker`. Например, найдём все **текстовые** узлы (то, чего не умеет `querySelectorAll`):

```js
const walker = document.createTreeWalker(
  document.getElementById("catalog"), // откуда начинать
  NodeFilter.SHOW_TEXT                // какие узлы показывать: только текст
);

const words = [];
let node;
// nextNode() переходит к следующему подходящему узлу или возвращает null в конце
while ((node = walker.nextNode())) {
  const text = node.data.trim();       // убираем пробелы и переносы
  if (text) words.push(text);          // пустые текстовые узлы пропускаем
}
console.log(words); // ["Книги", "Мастер и Маргарита", "Тихий Дон", "Евгений Онегин", "Найти"]
```

## 7. Особые коллекции документа

Некоторые элементы доступны сразу, без поиска:

```js
document.forms;          // все формы страницы
document.forms.search;   // форма с id или name="search"
document.forms.search.elements.query; // поле name="query" внутри неё (подробно — часть 6)
document.images;         // все <img>
document.links;          // все <a href> и <area href>
```

## 8. Как выбирать способ поиска

| Ситуация | Метод |
|---|---|
| Один уникальный элемент | `getElementById("id")` или `querySelector("#id")` |
| Первый элемент по любому селектору | `querySelector(sel)` |
| Все элементы по селектору | `querySelectorAll(sel)` |
| Элемент внутри известного блока | `block.querySelector(sel)` |
| «В каком пункте/карточке находится этот элемент?» | `el.closest(sel)` |
| «Подходит ли элемент под условие?» | `el.matches(sel)` |
| Соседний элемент | `nextElementSibling` / `previousElementSibling` |

**Совет по структуре кода.** Находите элементы **один раз** в начале и сохраняйте в константы, а не ищите в каждом обработчике заново:

```js
// В начале файла — все элементы, с которыми работает скрипт
const catalog = document.getElementById("catalog");
const bookList = catalog.querySelector(".books");
const searchForm = catalog.querySelector("#search");
const searchInput = searchForm.querySelector('input[name="query"]');

// Дальше в коде используем эти константы
```

## 9. Частые ошибки

- **`getElementById("#catalog")`** вернёт `null`: решётка — часть CSS-селектора, а `getElementById` принимает чистый id.
- **`querySelector("book")`** ищет **тег** `<book>`, а не класс. Для класса нужна точка: `".book"`.
- **`document.querySelectorAll(".book").textContent`** — `undefined`: у списка нет `textContent`, нужно перебрать элементы.
- **`.map` у `NodeList`** — превратите в массив через `Array.from`.
- **Селектор с особыми символами.** Если id начинается с цифры (`id="1st"`), селектор `#1st` некорректен. Используйте `getElementById("1st")` или `CSS.escape`: `querySelector("#" + CSS.escape("1st"))`.

**Проверьте себя:**

1. Что вернёт `document.querySelector(".books li:nth-child(2)").textContent`?
2. Чем отличаются `list.children` и `list.childNodes`?
3. Почему `getElementsByClassName` может «пропускать» элементы в цикле с удалением?
4. Как из кнопки внутри карточки товара быстро получить саму карточку `.card`?

Следующая часть — как читать и менять содержимое, атрибуты, классы и стили.
