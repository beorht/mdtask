# Теория: DOM и объект document

Когда браузер открывает HTML-страницу, он превращает её в дерево объектов — **DOM** (Document Object Model). Каждый тег становится объектом-*узлом*, у которого есть свойства (текст, атрибуты, классы) и методы. JavaScript получает доступ к этому дереву через глобальный объект **`document`** и может менять страницу «на лету»: находить элементы, менять текст и стили, создавать и удалять узлы, реагировать на действия пользователя.

## 1. Дерево DOM

```html
<body>
  <h1 id="title">Магазин</h1>
  <ul class="list">
    <li>Хлеб</li>
    <li>Молоко</li>
  </ul>
</body>
```

Здесь `body` — родитель для `h1` и `ul`, `ul` — родитель для двух `li`, а `li` — «соседи» (siblings). Полезные свойства для перемещения по дереву:

| Свойство | Что возвращает |
|---|---|
| `el.parentElement` | родительский элемент |
| `el.children` | дочерние элементы (коллекция) |
| `el.firstElementChild` / `el.lastElementChild` | первый / последний дочерний элемент |
| `el.nextElementSibling` / `el.previousElementSibling` | следующий / предыдущий сосед |
| `el.closest("селектор")` | ближайший предок (или сам элемент), подходящий под селектор |

## 2. Подключение скрипта

Скрипт должен запускаться **после** того, как браузер построил нужные элементы, иначе `document.querySelector(...)` вернёт `null`. Два надёжных способа:

```html
<!-- 1) атрибут defer: скрипт выполнится после разбора всего HTML -->
<script src="script.js" defer></script>

<!-- 2) или подключить скрипт в самом конце body -->
  <script src="script.js"></script>
</body>
```

## 3. Поиск элементов

```js
const title = document.getElementById("title");        // по id (без #)
const list  = document.querySelector(".list");         // первый по CSS-селектору
const items = document.querySelectorAll(".list li");   // все подходящие (NodeList)

items.forEach((li) => console.log(li.textContent));
console.log(items.length); // 2
```

- `querySelector` возвращает **первый** найденный элемент или `null`.
- `querySelectorAll` возвращает **статический** список `NodeList` — у него есть `forEach` и `length`, но это не массив. Нужен массив — `Array.from(items)` или `[...items]`.
- Искать можно и внутри элемента: `list.querySelector("li")`.

## 4. Содержимое элемента

```js
title.textContent = "Новый заголовок";      // только текст
list.innerHTML = "<li>Сыр</li><li>Чай</li>"; // разбирается как HTML
```

> **Безопасность.** Всё, что вводит пользователь (поля формы, данные с сервера), выводите через **`textContent`**, а не `innerHTML`. Если вставить через `innerHTML` строку `<img src=x onerror="alert('взлом')">`, браузер выполнит чужой код — это уязвимость **XSS**. `innerHTML` допустим только для вашей собственной, заранее известной разметки.

Для полей формы текст лежит не в `textContent`, а в свойстве **`value`**: `input.value`, `textarea.value`, `select.value`.

## 5. Атрибуты, классы, стили, data-атрибуты

```js
const link = document.querySelector("a");
link.getAttribute("href");            // прочитать атрибут
link.setAttribute("target", "_blank"); // установить
link.removeAttribute("title");         // удалить

const box = document.querySelector(".box");
box.classList.add("active");        // добавить класс
box.classList.remove("hidden");     // убрать
box.classList.toggle("dark");       // переключить (есть → убрать, нет → добавить)
box.classList.contains("active");   // проверить → true/false

box.style.color = "red";            // inline-стиль (свойства в camelCase:)
box.style.backgroundColor = "#eee"; // background-color → backgroundColor
```

Лучше менять **классы**, а сами стили описывать в CSS — так код чище, а оформление проще поменять.

**data-атрибуты** — свои данные прямо в разметке: `<button data-id="7" data-price="350">`. В JS они доступны через `dataset` (имена в camelCase, значения — всегда строки):

```js
const btn = document.querySelector("button");
console.log(btn.dataset.id);            // "7"
console.log(Number(btn.dataset.price)); // 350
```

Чтобы скрыть элемент, удобно использовать атрибут `hidden`: `el.hidden = true` / `el.hidden = false`.

## 6. Создание, вставка и удаление элементов

```js
const li = document.createElement("li"); // создать (пока он не на странице)
li.textContent = "Яблоки";
li.classList.add("item");

list.append(li);    // в конец списка
list.prepend(li);   // в начало (элемент переносится, а не копируется)
li.remove();        // удалить со страницы
list.replaceChildren(); // очистить список целиком
```

Если нужно добавить много элементов, сначала соберите их, а потом вставьте одним вызовом: `list.append(...arrayOfElements)` — так страница перерисовывается один раз.

## 7. События

```js
const button = document.querySelector("#save");

button.addEventListener("click", (event) => {
  console.log("Нажали!", event.target); // event.target — элемент, по которому кликнули
});
```

Частые события:

| Событие | Когда срабатывает |
|---|---|
| `click` | клик мышью (и Enter/пробел на кнопке) |
| `input` | каждое изменение текста в поле |
| `change` | значение поля изменено и «подтверждено» (чекбокс, select, потеря фокуса) |
| `submit` | отправка формы (на элементе `<form>`) |
| `keydown` | нажатие клавиши (`event.key` — какая) |
| `DOMContentLoaded` | HTML загружен и разобран (на `document`) |

Обработчики пишите в JS через `addEventListener`, а **не** атрибутами в HTML (`onclick="..."`): так разметка и логика не перемешиваются, и на одно событие можно повесить несколько обработчиков.

**Всплытие и делегирование.** Событие сначала срабатывает на элементе, затем «всплывает» к его родителям. Поэтому вместо того чтобы вешать обработчик на каждую кнопку в списке (в том числе на кнопки, которые добавятся позже), можно повесить **один** обработчик на родителя и проверить, где был клик:

```js
list.addEventListener("click", (event) => {
  const btn = event.target.closest(".delete");
  if (!btn) return;                 // кликнули не по кнопке «удалить»
  btn.closest("li").remove();       // удаляем пункт, в котором эта кнопка
});
```

## 8. Формы

```js
const form = document.querySelector("#signup");
const email = form.querySelector("#email");

form.addEventListener("submit", (event) => {
  event.preventDefault();            // не перезагружать страницу
  const value = email.value.trim();  // убрать пробелы по краям
  if (!value.includes("@")) {
    email.classList.add("invalid");
    return;
  }
  console.log("Отправляем", value);
  form.reset();                      // очистить поля
});
```

`event.preventDefault()` отменяет действие браузера по умолчанию: отправку формы с перезагрузкой, переход по ссылке и т. п.

## 9. Хранение данных: localStorage

`localStorage` хранит строки в браузере, и они остаются после перезагрузки страницы. Массивы и объекты сохраняют через JSON:

```js
const todos = [{ text: "Купить хлеб", done: false }];
localStorage.setItem("todos", JSON.stringify(todos));      // сохранить

const saved = JSON.parse(localStorage.getItem("todos") || "[]"); // прочитать (или пустой массив)
localStorage.removeItem("todos");                          // удалить
```

Удобный приём: хранить данные в массиве, а страницу целиком перерисовывать из него функцией `render()` после каждого изменения — так данные и то, что на экране, не расходятся.

## 10. Шпаргалка

| Задача | Код |
|---|---|
| Найти по id | `document.getElementById("id")` |
| Найти первый / все | `document.querySelector(sel)` / `document.querySelectorAll(sel)` |
| Текст | `el.textContent = "..."` |
| Значение поля | `input.value` |
| Класс | `el.classList.add / remove / toggle / contains` |
| Скрыть / показать | `el.hidden = true / false` |
| Создать и вставить | `const x = document.createElement("li"); parent.append(x)` |
| Удалить | `el.remove()` |
| Событие | `el.addEventListener("click", handler)` |
| Отменить действие по умолчанию | `event.preventDefault()` |
| Ближайший предок | `event.target.closest(sel)` |
| data-атрибут | `el.dataset.name` |
| Сохранить / прочитать | `localStorage.setItem(k, JSON.stringify(v))` / `JSON.parse(localStorage.getItem(k))` |

## 11. Частые ошибки

- **`Cannot read properties of null`** — элемент не найден: опечатка в селекторе (`"title"` вместо `"#title"`), или скрипт запустился раньше, чем появился HTML (нет `defer`).
- **`getElementById("#title")`** — у `getElementById` решётка не нужна, это не CSS-селектор.
- **Число из поля** — `input.value` всегда строка: `"2" + "3"` даст `"23"`. Переводите: `Number(input.value)`.
- **`querySelectorAll` вместо `querySelector`** — у `NodeList` нет `textContent`/`addEventListener`, его нужно перебрать через `forEach`.
- **Обработчик на элементах, созданных позже**, не повесится сам — используйте делегирование (раздел 7).
- **Страница перезагружается при отправке формы** — забыли `event.preventDefault()` в обработчике `submit`.
- **`innerHTML` с данными пользователя** — уязвимость XSS; для текста — `textContent`.

## 12. Как сдавать задачи этого раздела

Каждая задача — отдельная страница: `index.html` + `script.js` (и при желании `style.css`). Без библиотек и фреймворков — только «чистый» JavaScript. Откройте `index.html` в браузере и проверьте работу, ошибки смотрите в консоли (F12 → Console). Сдавайте **архив** (`.zip` или `.rar`) с файлами задачи на странице задания.
