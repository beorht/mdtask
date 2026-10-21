# Теория DOM. Часть 6. Формы

Формы — главный способ получить данные от пользователя: поиск, заказ, отзыв, настройки. В этой части — как читать поля разных типов, как работает отправка формы, как собрать все данные сразу через `FormData` и как проверять ввод: встроенными средствами браузера и своим кодом.

Разметка для примеров — форма заказа книги:

```html
<form id="order" novalidate>
  <label>
    Книга
    <select name="book" required>
      <option value="">— выберите —</option>
      <option value="1">Мастер и Маргарита</option>
      <option value="2">Тихий Дон</option>
    </select>
  </label>

  <label>
    Количество
    <input name="qty" type="number" min="1" max="10" value="1" required>
  </label>

  <fieldset>
    <legend>Доставка</legend>
    <label><input type="radio" name="delivery" value="pickup" checked> Самовывоз</label>
    <label><input type="radio" name="delivery" value="courier"> Курьер</label>
  </fieldset>

  <label>
    Телефон
    <input name="phone" type="tel" pattern="\+998\d{9}" placeholder="+998901234567" required>
  </label>

  <label><input type="checkbox" name="gift"> Подарочная упаковка</label>

  <label>
    Комментарий
    <textarea name="comment" rows="3"></textarea>
  </label>

  <button type="submit">Оформить</button>
  <button type="reset">Очистить</button>
  <p class="form-status" role="status"></p>
</form>
```

---

## 1. Доступ к форме и её полям

```js
// Обычный поиск
const form = document.getElementById("order");

// Через коллекцию форм документа — по id или name
const sameForm = document.forms.order;

// form.elements — все поля формы, доступ по атрибуту name
const { book, qty, phone, gift, comment } = form.elements;

// Группа радиокнопок с одним name — это RadioNodeList
const delivery = form.elements.delivery;

// У каждого поля есть обратная ссылка на форму
console.log(qty.form === form); // true
```

Обращение по `name` удобнее поиска по селектору: имена полей не меняются при правке разметки, а `form.elements` найдёт поле, даже если оно глубоко вложено в `<label>` и `<fieldset>`.

## 2. Чтение и запись значений

| Поле | Как прочитать | Тип значения |
|---|---|---|
| `<input type="text">`, `email`, `tel`, `<textarea>` | `input.value` | строка |
| `<input type="number">`, `range` | `input.value` (строка) или `input.valueAsNumber` (число) | строка / число |
| `<input type="date">` | `input.value` (`"2026-10-21"`) или `input.valueAsDate` | строка / `Date` |
| `<input type="checkbox">` | `checkbox.checked` | `true` / `false` |
| Группа `radio` | `form.elements.delivery.value` — значение отмеченной | строка |
| `<select>` | `select.value`, `select.selectedIndex`, `select.selectedOptions` | строка / число / список |
| `<select multiple>` | `[...select.selectedOptions].map(o => o.value)` | массив |
| `<input type="file">` | `input.files` — список файлов | `FileList` |

```js
const { book, qty, phone, gift, delivery } = form.elements;

console.log(book.value);                          // "2" — value выбранного option
console.log(book.selectedOptions[0].textContent); // "Тихий Дон" — его текст
console.log(qty.value);                           // "1" — строка!
console.log(qty.valueAsNumber);                   // 1 — число (NaN, если поле пустое)
console.log(gift.checked);                        // false
console.log(delivery.value);                      // "pickup"

// Запись
qty.value = 3;                // браузер сохранит строку "3"
gift.checked = true;          // отметить флажок
delivery.value = "courier";   // отметить радиокнопку с этим value
book.value = "1";             // выбрать вариант списка
```

> **Помните:** `value` всегда строка. `"2" + "3"` даёт `"23"`, а не `5`. Переводите явно: `Number(qty.value)` или `qty.valueAsNumber`.

## 3. События полей

```js
// input — на каждое изменение: каждая буква, вставка, удаление
phone.addEventListener("input", () => {
  console.log("сейчас в поле:", phone.value);
});

// change — изменение «подтверждено»:
// для текста — когда поле теряет фокус; для флажков, радио и select — сразу
book.addEventListener("change", () => {
  console.log("выбрана книга", book.value);
});

// Одно событие на всю форму: input и change всплывают от полей к форме
form.addEventListener("input", (event) => {
  // event.target — поле, которое изменилось; его имя — event.target.name
  console.log("изменилось поле", event.target.name);
});
```

Последний приём — делегирование для форм: один обработчик на форму вместо обработчика на каждое поле.

## 4. Отправка формы

### Что делает браузер по умолчанию

Когда пользователь нажимает кнопку `type="submit"` или Enter в текстовом поле, браузер:

1. запускает **встроенную проверку** полей (`required`, `pattern`, `min`…) — если она не прошла, показывает подсказку и дальше не идёт (атрибут `novalidate` у формы отключает этот шаг);
2. генерирует событие **`submit`** на форме;
3. если обработчик не вызвал `preventDefault()`, **отправляет** данные по адресу `action` формы и **загружает новую страницу**.

В современных интерфейсах третий шаг почти всегда отменяют и обрабатывают данные скриптом:

```js
form.addEventListener("submit", (event) => {
  event.preventDefault(); // страница не перезагрузится

  // … проверка и обработка данных …
});
```

> Слушайте именно `submit` на **форме**, а не `click` на кнопке: `submit` срабатывает и при нажатии Enter в поле, и при щелчке по кнопке, а `click` — только при щелчке.

### `reset`

Кнопка `type="reset"` и метод `form.reset()` возвращают поля к **начальным** значениям из HTML (атрибуты `value`, `checked`, `selected`) и генерируют событие `reset`.

```js
form.addEventListener("reset", () => {
  form.querySelector(".form-status").textContent = "";
});
```

## 5. `FormData` — все данные формы сразу

```js
form.addEventListener("submit", (event) => {
  event.preventDefault();

  // Браузер собирает значения всех полей с атрибутом name.
  // Не попадают: поля без name, disabled-поля, неотмеченные флажки и радио.
  const data = new FormData(form);

  console.log(data.get("book"));     // "2"
  console.log(data.get("delivery")); // "courier"
  console.log(data.get("gift"));     // "on" — флажок отмечен (value по умолчанию "on")
                                     // null — не отмечен (его нет в FormData)

  // Перебор всех пар имя–значение
  for (const [name, value] of data) {
    console.log(name, "=", value);
  }

  // Превратить в обычный объект
  const order = Object.fromEntries(data);
  // { book: "2", qty: "1", delivery: "courier", phone: "+998901234567", gift: "on", comment: "" }

  // Привести типы — FormData хранит строки (и файлы)
  const normalized = {
    book: Number(order.book),
    qty: Number(order.qty),
    delivery: order.delivery,
    phone: order.phone.trim(),
    gift: data.has("gift"),            // true / false
    comment: order.comment.trim(),
  };
  console.log(normalized);
});
```

Для полей с несколькими значениями (`<select multiple>`, несколько флажков с одним `name`) используйте `data.getAll("name")` — он вернёт массив.

`FormData` можно сразу отправить на сервер (часть 7): `fetch("/api/order", { method: "POST", body: data })`.

## 6. Встроенная проверка браузера (Constraint Validation API)

HTML-атрибуты описывают правила, а браузер проверяет их сам:

| Атрибут | Правило |
|---|---|
| `required` | Поле не пустое (флажок отмечен, в списке выбран не пустой вариант) |
| `type="email"`, `type="url"` | Значение похоже на адрес почты / сайта |
| `min`, `max`, `step` | Границы и шаг для чисел и дат |
| `minlength`, `maxlength` | Длина текста |
| `pattern` | Значение целиком соответствует регулярному выражению |

Даже с `novalidate` браузер **знает** результат проверки, и его можно получить из JavaScript:

```js
const { qty, phone } = form.elements;

qty.value = "15";
console.log(qty.checkValidity());     // false — больше max
console.log(qty.validity.rangeOverflow); // true — причина
console.log(qty.validationMessage);   // текст ошибки браузера на языке системы

phone.value = "12345";
console.log(phone.validity.patternMismatch); // true

console.log(form.checkValidity());    // false — хотя бы одно поле неверно
```

Объект `validity` показывает **причину** ошибки:

| Свойство | Когда `true` |
|---|---|
| `valueMissing` | Нарушен `required` |
| `typeMismatch` | Не подходит под `type` (email, url) |
| `patternMismatch` | Не подходит под `pattern` |
| `tooShort` / `tooLong` | Нарушены `minlength` / `maxlength` |
| `rangeUnderflow` / `rangeOverflow` | Меньше `min` / больше `max` |
| `stepMismatch` | Не попадает в `step` |
| `badInput` | Браузер не смог разобрать ввод (буквы в числовом поле) |
| `customError` | Задана своя ошибка через `setCustomValidity` |
| `valid` | Ошибок нет |

### Свои сообщения об ошибках

```js
// Тексты ошибок для каждой причины — по-русски и понятно
const MESSAGES = {
  valueMissing: "Заполните это поле",
  patternMismatch: "Формат: +998 и 9 цифр",
  rangeUnderflow: "Не меньше 1",
  rangeOverflow: "Не больше 10",
};

// Возвращает текст ошибки поля или "" если всё в порядке
function errorOf(field) {
  for (const reason in MESSAGES) {
    if (field.validity[reason]) return MESSAGES[reason];
  }
  return field.validity.valid ? "" : field.validationMessage; // запасной вариант
}
```

### `setCustomValidity` — правило, которого нет в HTML

```js
const { qty, delivery } = form.elements;

// Курьер везёт не меньше двух книг — такого атрибута нет, задаём правило сами
function checkCourierQty() {
  const tooFew = delivery.value === "courier" && qty.valueAsNumber < 2;
  // Непустая строка — поле считается неверным; пустая — ошибки нет
  qty.setCustomValidity(tooFew ? "Курьером — от 2 книг" : "");
}

form.addEventListener("change", checkCourierQty);
```

В CSS неверные поля можно подсветить псевдоклассами `:invalid` / `:valid`. Чтобы рамка не краснела ещё до того, как пользователь что-то ввёл, используйте `:user-invalid` (срабатывает после взаимодействия с полем) или свой класс, который добавляет скрипт:

```css
input:user-invalid,
select:user-invalid { border-color: #dc2626; }

.field-error        { color: #dc2626; font-size: 0.875rem; }
```

## 7. Показ ошибок рядом с полями

Соединим всё вместе: при отправке проверяем поля и выводим ошибки под ними, при исправлении поля — убираем ошибку.

```js
const form = document.getElementById("order");
const status = form.querySelector(".form-status");

// Находит или создаёт элемент для ошибки сразу после поля
function errorBox(field) {
  let box = field.parentElement.querySelector(".field-error");
  if (!box) {
    box = document.createElement("small");
    box.className = "field-error";
    box.id = `${field.name}-error`;
    field.parentElement.append(box);
    // Связываем поле с текстом ошибки — экранный диктор прочитает его вместе с полем
    field.setAttribute("aria-describedby", box.id);
  }
  return box;
}

function showError(field, message) {
  errorBox(field).textContent = message;
  field.setAttribute("aria-invalid", message ? "true" : "false");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  // Проверяем все поля с name (кроме кнопок и fieldset; у радиокнопок здесь
  // правил нет, а ошибку группы удобнее выводить под <fieldset>, а не под каждой кнопкой)
  const fields = [...form.elements].filter((f) => f.name && f.willValidate && f.type !== "radio");
  let firstInvalid = null;

  for (const field of fields) {
    const message = errorOf(field);
    showError(field, message);
    if (message && !firstInvalid) firstInvalid = field;
  }

  if (firstInvalid) {
    firstInvalid.focus(); // переводим фокус на первое неверное поле
    status.textContent = "Проверьте выделенные поля";
    return;
  }

  status.textContent = "Заказ оформлен";
  form.reset();
});

// Исправили поле — ошибка под ним пропадает сразу
form.addEventListener("input", (event) => {
  const field = event.target;
  if (field.name && field.getAttribute("aria-invalid") === "true") {
    showError(field, errorOf(field));
  }
});
```

Как выполняется: `form.elements` содержит все элементы управления; `willValidate` отсекает кнопки и `fieldset`. Для каждого поля `errorOf` читает `validity`, которое браузер уже вычислил по атрибутам. Ошибки выводятся через `textContent`, первое неверное поле получает фокус.

## 8. Проверка своим кодом

Встроенная проверка удобна, но иногда правила сложнее, или их нужно проверить и вне формы. Тогда правила описывают в JavaScript. Удобный способ — объект «имя поля → функция проверки»:

```js
// Каждая функция получает значение и все данные формы,
// возвращает текст ошибки или "" если всё верно.
const RULES = {
  book: (value) => (value ? "" : "Выберите книгу"),

  qty: (value) => {
    const n = Number(value);
    if (!Number.isInteger(n)) return "Введите целое число";
    if (n < 1 || n > 10) return "От 1 до 10";
    return "";
  },

  // Правило, которое зависит от другого поля
  comment: (value, all) =>
    all.gift === "on" && value.trim().length < 3 ? "Напишите, что подписать на открытке" : "",
};

function validate(form) {
  const all = Object.fromEntries(new FormData(form)); // все значения формы
  const errors = {};
  for (const [name, rule] of Object.entries(RULES)) {
    const message = rule(all[name] ?? "", all);
    if (message) errors[name] = message;
  }
  return errors; // {} — ошибок нет
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const errors = validate(form);

  // Показываем или убираем ошибку у каждого поля из правил
  for (const name of Object.keys(RULES)) {
    showError(form.elements[name], errors[name] || "");
  }

  if (Object.keys(errors).length === 0) {
    console.log("Данные верны, отправляем");
  }
});
```

Плюс подхода: правила — обычные функции, их легко прочитать, дополнить и проверить отдельно от страницы.

> Проверка в браузере нужна для **удобства** пользователя. Она не защищает сервер: любой может отправить запрос в обход вашей страницы. Сервер всегда проверяет данные заново.

## 9. Полезные приёмы

```js
// Заблокировать кнопку на время отправки, чтобы не отправили дважды
const submitButton = form.querySelector('[type="submit"]');
submitButton.disabled = true;
// … после ответа сервера:
submitButton.disabled = false;

// Заблокировать сразу все поля группы
form.querySelector("fieldset").disabled = true;

// Поставить фокус в первое поле при открытии формы
form.elements.book.focus();

// Выделить весь текст поля
form.elements.phone.select();

// Отправить форму из кода, пройдя проверку и событие submit
form.requestSubmit();
// (form.submit() отправляет БЕЗ проверки и БЕЗ события submit — обычно это не то, что нужно)

// Показать/скрыть блок в зависимости от выбора
const courierBlock = document.getElementById("courier-address");
form.addEventListener("change", () => {
  courierBlock.hidden = form.elements.delivery.value !== "courier";
});
```

## 10. Частые ошибки

- **Страница перезагружается** — нет `event.preventDefault()` в обработчике `submit`, или обработчик повешен на `click` кнопки.
- **Сложение превращается в склейку строк** — значение поля не переведено в число.
- **`FormData` не видит поле** — у поля нет атрибута `name` или оно `disabled`.
- **Флажок всегда «on»** — читаете `checkbox.value`, а нужно `checkbox.checked`.
- **Пробелы считаются вводом** — используйте `value.trim()` перед проверкой на пустоту.
- **Кнопка «Отмена» отправляет форму** — у `<button>` внутри формы по умолчанию `type="submit"`; задайте `type="button"`.
- **Ошибки выводятся через `innerHTML` с введённым текстом** — уязвимость XSS; только `textContent`.

**Проверьте себя:**

1. Какие поля не попадут в `new FormData(form)`?
2. Чем `change` отличается от `input` для текстового поля и для флажка?
3. Как узнать, что поле нарушает именно `pattern`, а не `required`?
4. Почему проверки в браузере недостаточно для защиты данных?

Следующая часть — профессиональные приёмы: состояние, запросы к серверу, наблюдатели, анимации, производительность, доступность и безопасность.
