# fetch и API

**API** — адрес на сервере, который отдаёт данные (обычно в JSON) по запросу. В браузере запросы делают функцией
`fetch`:

```js run
const response = await fetch('http://api.edu/weather?city=Ташкент');
console.log(response.status, response.ok);
const data = await response.json();
console.log(data);
```

1. `fetch(адрес)` возвращает Promise с **ответом** (`response`);
2. `response.status` — код ответа: 200 — всё хорошо, 201 — создано, 400 — неверный запрос, 401 — нужен ключ, 404 — не
   найдено, 500 — ошибка сервера; `response.ok` — истина для 200–299;
3. `await response.json()` — разобрать тело ответа как JSON (тоже Promise).

**Важно:** при 404 или 500 `fetch` **не** бросает ошибку — это обычный ответ. Ошибку он бросает, только если сервер
недоступен совсем. Поэтому всегда проверяйте `response.ok`.

## Учебный API

В курсе нет интернета: `fetch` ходит в учебный сервер `http://api.edu`, встроенный в сайт.

| Адрес | Что отдаёт |
| --- | --- |
| `GET /cities` | массив названий городов |
| `GET /weather?city=Город` | `{ city, temp, sky, wind }`; 404 — города нет; 400 — нет параметра |
| `GET /rates?base=USD` | `{ base, rates: { … } }`, нужен заголовок `X-API-Key` (ключ `edu-key-2026`); 401 — без ключа |
| `GET /students/<id>` | `{ id, name, group, scores }`; 404 — нет такого |
| `GET /notes` | массив заметок `{ id, text }` |
| `POST /notes` | создать заметку: тело — JSON `{ "text": … }`; ответ 201 и новая заметка |

## Параметры, заголовки, POST

```js run
const created = await fetch('http://api.edu/notes', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ text: 'купить хлеб' }),
});
console.log(created.status, await created.json());
```

- русские буквы и пробелы в параметрах кодируют: `encodeURIComponent(city)`;
- заголовки — объект `headers`, ключ API обычно передают в заголовке, а не в адресе.

## Функция-обёртка

Удобно один раз написать `getJSON(url)`, которая делает запрос, проверяет `ok` и бросает ошибку с понятным текстом —
тогда остальной код работает только с данными.
