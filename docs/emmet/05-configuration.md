# 5. Параметры и конфигурация

## Окружение

| Что | Значение |
| --- | --- |
| Node.js | 20.19+ или 22.12+ (требование Vite 8) |
| Модули | ESM (`"type": "module"`); JSON импортируется с `with { type: 'json' }` |
| Переменные окружения | `PORT` (по умолчанию `3000`), `HOST` (по умолчанию `0.0.0.0`) — только для `server/index.js` |
| Сеть | HTTP без TLS, рассчитано на LAN класса. Порт должен быть открыт в брандмауэре |

## Команды (package.json)

| Команда | Что делает |
| --- | --- |
| `npm run dev` | Vite dev-сервер с HMR и API → `:5173` |
| `npm run build` | Сборка в `dist/` (два входа: `index.html`, `admin.html`) |
| `npm start` | `node server/index.js`: `dist/` + API. Без сборки не стартует |
| `npm run preview` | Vite preview собранного `dist/` с API → `:4173` |
| `npm run keys` | `scripts/generate-keys.js`: roster.txt → accounts.json, keys.csv, keys.md |
| `npm test` | `vitest run` |

Запуск на занятии на нужном порту: `npm run build && PORT=5173 npm start`.

## Зависимости

| Пакет | Версия | Зачем |
| --- | --- | --- |
| `codemirror` | ^6.0.2 | Редактор |
| `@codemirror/view` | ^6.43.15 | EditorView, keymap, decorations, placeholder |
| `@codemirror/state` | ^6.7.6 | EditorState, StateField, Compartment, transactionFilter |
| `@codemirror/commands` | ^6.11.1 | history, indent, invertedEffects |
| `@codemirror/lang-html` | ^6.4.12 | Подсветка HTML (`autoCloseTags: false`) |
| `@codemirror/language` | ^6.13.1 | HighlightStyle, indentUnit, bracketMatching |
| `@lezer/highlight` | ^1.2.5 | Теги подсветки |
| `emmet` | ^2.4.11 | `expand` и `extract` |
| `@fontsource/oswald` | ^5.3.0 | Шрифт заголовков (500) |
| `@fontsource/montserrat` | ^5.3.0 | Шрифт интерфейса (400, 500, 600) |
| `@fontsource/jetbrains-mono` | ^5.3.0 | Моноширинный (400, 500) |
| dev: `vite` | ^8.3.5 | Сборка, dev-сервер; `rolldownOptions.input` |
| dev: `vitest` | ^5.0.5 | Тесты |
| dev: `happy-dom` | ^21.0.4 | DOM для тестов (template, parseTree, sanitize) |

## vite.config.js

- Плагин `trainer-api`: подключает `createApi()` как middleware в `configureServer` и `configurePreviewServer`, переписывает `/admin` → `/admin.html`.
- `build.rolldownOptions.input = { main: 'index.html', admin: 'admin.html' }`.
- `chunkSizeWarningLimit: 700`: CodeMirror и Emmet дают один крупный бандл, это ожидаемо.

## Константы сервера

| Константа | Файл | Значение | Смысл |
| --- | --- | --- | --- |
| `PLAN` | assignment.js | `{1: 3, 2: 2, 3: 5}` | Сколько работ каждого уровня в личном наборе (итого 10) |
| `MAX_BODY` | api.js | 64 КБ | Максимальный размер тела запроса |
| `MAX_CODE` | api.js | 20 000 символов | Обрезка кода попытки |
| `MAX_AWAY` | api.js | 12 ч | Верхняя граница одного ухода |
| `LOGIN_WINDOW` / `LOGIN_LIMIT` | api.js | 5 мин / 10 | Ограничение неудачных входов с одного IP |
| `STATUSES` | api.js | success, partial, error, mismatch | Допустимые статусы попытки |
| `BLOCKED_KINDS` | api.js | paste, drop, bulk | Допустимые виды заблокированного ввода |
| `FINISHED` | api.js | «Занятие окончено. Ваши результаты сохранены.» | Текст ошибки при закрытом занятии |
| `SAVE_DELAY` | store.js | 300 мс | Задержка записи stats.json |
| `AWAY_SUSPICIOUS` | store.js | 15 с | Длинный уход |
| `SOLVE_WINDOW` | store.js | 2 мин | Решение в этом окне после длинного ухода получает флаг `solvedAfterAway` |
| Кеш статики | index.js | `assets/*` — `max-age=31536000, immutable`; остальное — `no-cache` | |

## Константы клиента

| Константа | Файл | Значение | Смысл |
| --- | --- | --- | --- |
| `SESSION_POLL` | main.js | 15 с | Опрос `/api/session` |
| `TOAST_TIME` | main.js | 6 с | Время показа уведомления |
| `RETRY_DELAY` | Api.js | 5 с | Повтор отправки событий без связи |
| `PREVIEW_DELAY` | CodeEditorPanel.js | 250 мс | Debounce живого предпросмотра |
| `MAX_TYPED_CHARS` | CodeEditorPanel.js | 2 | Больше непробельных символов за одну транзакцию `input.type` — считается вставкой (`bulk`) |
| Предпросмотр открыт | CodeEditorPanel.js | `innerHeight >= 820` | На низких экранах «Результат» свёрнут |
| `minAway` | FocusMonitor.js | 2 с | Минимальный учитываемый уход |
| `POLL_INTERVAL` | FocusMonitor.js | 1 с | Опрос `document.hasFocus()` |
| `INDENT` | EmmetService.js | 2 пробела | Отступ развёртывания и редактора |
| `ABBREVIATION_START` | CodeEditorPanel.js | `/^[a-zA-Z.#(]/` | В html-режиме Tab разворачивает только то, что похоже на сокращение |
| `REFRESH_INTERVAL` | admin/main.js | 10 с | Автообновление панели (только при видимой вкладке) |
| `ONLINE_WINDOW` | admin/stats.js | 5 мин | «Сейчас в тетради» |
| CSP предпросмотра | PreviewFrame.js | `default-src 'none'; style-src 'unsafe-inline'; img-src data:` | |

## Брейкпоинты интерфейса

| Условие | Что меняется |
| --- | --- |
| `max-width: 1100px` | Точки навигации уже |
| `max-width: 960px` | Панели в одну колонку, у страницы появляется прокрутка |
| `max-width: 760px` | Примеры теории в одну колонку |
| `max-width: 720px` | Скрыты имя студента и точки (остаются счётчик и стрелки); в панели скрыты подписи кнопок |
| `max-width: 480px` | `--pad: 14px`, `--gap: 10px`, скрыта подсказка по клавишам |
| `max-height: 640px` и `min-width: 961px` | Прокрутка страницы, min-height 640 |
| `@container (min-width: 500px)` | В подсказке по клавишам появляется вторая клавиша |

## Клавиши редактора

| Клавиши | Режим `emmet` | Режим `html` |
| --- | --- | --- |
| `Tab` | Развернуть сокращение слева от курсора и проверить; без сокращения — только проверить | Развернуть, только если сокращение — это вся строка и начинается с `[a-zA-Z.#(]`; иначе вставить отступ |
| `Ctrl/⌘+Enter` | Проверить | Проверить |
| `Ctrl+]` / `Ctrl+[`, `Shift+Tab` | Отступ +/− | Отступ +/− |
| `Tab` при выделении | Отступ | Отступ |
| `Esc`, затем `Tab` | Выйти из редактора | Выйти из редактора |
| `Alt+↑/↓`, `Shift+Alt+↑/↓` | Отключены | Отключены |
| Кнопка «Проверить» | Однострочное неразвёрнутое сокращение сначала разворачивается | То же |
