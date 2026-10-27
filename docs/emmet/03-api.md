# 3. HTTP API

Базовый путь — `/api/`. Все ответы — JSON (`application/json; charset=utf-8`, `Cache-Control: no-store`).
Ошибка возвращается как `{ "error": "Текст по-русски", ...extra }` с соответствующим HTTP-статусом.

## Авторизация

- Ключ передаётся в заголовке `Authorization: Bearer <ключ>`.
- Ключ сравнивается после нормализации: верхний регистр, удаляется всё, кроме `A–Z0–9`. Поэтому `stweb 407`, `STWEB-407` и `stWeb407` — один и тот же ключ.
- Роли: `student` и `admin`. Если роль не та, сервер отвечает 403.
- **Ограничение на подбор ключа:** не больше 10 неудачных входов за 5 минут с одного IP, дальше 429.

## Маршруты

| Метод и путь | Доступ | Тело запроса | Ответ 200 |
| --- | --- | --- | --- |
| `POST /api/login` | все | `{ key }` | `{ role: "admin" }` или `{ role: "student", student: { id, name } }` |
| `GET /api/me` | студент | — | `{ student: {id, name}, assignment: string[20], progress: { solved: string[] } }` |
| `POST /api/events` | студент | событие (см. ниже) | `{ ok: true }` |
| `GET /api/session` | все | — | `{ closed: boolean }` |
| `GET /api/admin/overview` | админ | — | см. ниже |
| `POST /api/admin/reset` | админ | `{ studentId }` | `{ ok: true }` — статистика стирается, набор остаётся |
| `POST /api/admin/reassign` | админ | `{ studentId }` | `{ ok: true }` — новый случайный набор, статистика остаётся |
| `POST /api/admin/session` | админ | `{ closed: boolean }` | `{ closedAt: string \| null }` |

### События студента (`POST /api/events`)

Общее поле `exerciseId` обязательно и должно входить в план студента (иначе 400 «Этой работы нет в вашем наборе»).

| `type` | Доп. поля | Когда отправляется |
| --- | --- | --- |
| `open` | — | Студент открыл задание (не теорию) |
| `attempt` | `status`: `success \| partial \| error \| mismatch`; `handwritten`: bool; `code`: string (обрезается до 20 000 символов) | Каждая проверка непустого кода |
| `paste` | `kind`: `paste \| drop \| bulk` | Заблокированная вставка, перетаскивание или текст «куском» |
| `away` | `ms`: число > 0 (ограничено 12 ч) | Студент вернулся на страницу после ухода дольше 2 с |

### `GET /api/admin/overview`

```jsonc
{
  "closedAt": null,                       // или ISO-время завершения занятия
  "siteUrls": ["http://192.168.x.x:5173"],// адреса сервера в LAN (для карточек с ключами)
  "exercises": [                          // 40: 30 из банка Emmet + 10 контейнеров
    { "id": "practice-01", "title": "…", "difficulty": 1, "section": "emmet" }
  ],
  "students": [
    {
      "id": "s01", "name": "ФИО", "key": "stWeb-123",
      "firstSeen": "ISO", "lastSeen": "ISO",
      "assignment": ["practice-..", "...", "containers-01", "..."], // полный план, 20 id
      "exercises": { "<exerciseId>": { /* статистика, см. 04-data-model.md */ } }
    }
  ]
}
```

## Коды ошибок

| Статус | Когда | `extra` |
| --- | --- | --- |
| 400 | Некорректный JSON, событие, работа не из набора, `closed` не boolean | — |
| 401 | Ключ не найден; **или** занятие завершено (для студента на `/me` и `/events`) | `{ closed: true }` во втором случае |
| 403 | Не та роль | — |
| 404 | Нет такого маршрута; студент не найден (reset/reassign) | — |
| 413 | Тело запроса больше 64 КБ | — |
| 423 | Вход студента, пока занятие завершено | `{ closed: true }` |
| 429 | Слишком много неудачных входов | — |
| 500 | Непредвиденная ошибка (в лог сервера пишется стек) | — |

Если завершено занятие, сервер отвечает 401 (а не 403), чтобы вкладки, открытые до завершения, сразу
ушли со страницы работы. Клиент различает «ключ больше не действует» и «занятие окончено» по флагу `closed`.

## Клиентская обёртка (`src/services/Api.js`)

```js
api.login(key)              // POST /api/login
api.me(key)                 // GET  /api/me
api.sendEvent(key, event)   // POST /api/events
api.overview(key)           // GET  /api/admin/overview
api.reset(key, studentId)
api.reassign(key, studentId)
api.session()               // GET  /api/session
api.setClosed(key, closed)  // POST /api/admin/session
```

- При сетевой ошибке выбрасывается `ApiError(0, 'Нет связи с сервером…')`.
- При ответе не 2xx — `ApiError(status, data.error, Boolean(data.closed))`.
