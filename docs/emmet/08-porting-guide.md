# 8. Перенос в отдельный проект

## Варианты переноса

| Вариант | Что берёте | Трудоёмкость |
| --- | --- | --- |
| **A. Целиком** | Весь репозиторий без `node_modules`, `dist`, `server/data` | Минимальная |
| **B. Только тренажёр-движок** (редактор + Emmet + проверка, без аккаунтов) | `services/EmmetService`, `ValidationService`, `HandwrittenTracker`, `components/CodeEditorPanel`, `PreviewFrame`, `FeedbackMessage`, `ExerciseInstructions`, `TargetPanel`, стили | Средняя |
| **C. Только дизайн** | `docs/design/` (токены, компоненты) + `src/styles/*.css` | Низкая |
| **D. Встроить в существующий бэкенд** | Клиент целиком; переписать `server/api.js` под свой фреймворк по контракту из [03-api.md](03-api.md) | Средняя |

## Что копировать (вариант A/B)

```text
обязательно для клиента
  src/services/EmmetService.js
  src/services/ValidationService.js
  src/services/HandwrittenTracker.js
  src/services/ExerciseStore.js
  src/services/highlight.js
  src/components/*.js
  src/styles/main.css, src/styles/boxes.css
  src/data/exercises.json, src/data/containers.json
для аккаунтов и статистики
  src/services/Api.js, src/services/FocusMonitor.js
  src/main.js, src/admin/*
  server/*.js, scripts/generate-keys.js
  index.html, admin.html, vite.config.js
тесты
  tests/validation.test.js, tests/server.test.js
НЕ копировать
  server/data/   (ФИО, ключи, статистика)
  dist/, node_modules/, prof/
```

## Точки интеграции

| Что | Где менять | Заметки |
| --- | --- | --- |
| Хранилище | `server/store.js` | Интерфейс, на который опирается api.js: `accounts`, `findByKey`, `closed`, `session`, `setClosed`, `studentStats`, `assignmentOf`, `reassign`, `record`, `touch`, `reset`, `flush`. Его можно реализовать поверх SQLite или Postgres |
| Авторизация | `api.js → authenticate`, `Store.findByKey` | Bearer-ключ; можно заменить на сессии или JWT, сохранив роли `student/admin` |
| Состав плана | `api.js → planOf`, `assignment.js → PLAN` | Сейчас 10 личных + 10 общих |
| Шаг-теория | `main.js → buildPlan`, `LessonView.js` | Любые `kind: 'lesson'` шаги вставляются сюда |
| Режимы заданий | `exercise.mode` (`emmet`/`html`), `exercise.section` | Режим влияет на редактор, проверку, образец и обратную связь |
| Вид образца | `TargetPanel.load` | `section === 'containers'` → два превью |
| Фреймворк UI | Компоненты — классы с `root`; оборачиваются в React/Vue как «неуправляемые» компоненты через ref | CodeEditorPanel держит свой EditorView |
| Шрифты | Импорты `@fontsource/*` в `main.js` и `admin/main.js` | Без них сработают фолбэки (`Arial Narrow`, `system-ui`, `ui-monospace`) |

## Обязательные условия для работы

1. **Сборщик должен уметь `?raw`** (Vite умеет): `PreviewFrame.js` импортирует `boxes.css?raw`, чтобы вставить его в iframe. В другом сборщике нужен raw-loader, или CSS можно вставить строкой.
2. **Импорт JSON** на клиенте (Vite умеет), на сервере — `with { type: 'json' }` (Node 20.10+).
3. **DOM `<template>`** для `parseTree` и `sanitize`. В тестах его даёт happy-dom (`// @vitest-environment happy-dom` или глобальная настройка).
4. **Один процесс сервера на одни данные** (статистика в памяти).
5. **Обход Chrome для sandbox-iframe** (`ResizeObserver` + `reattach()` в `PreviewFrame`) нужно сохранить, если превью может оказаться в скрытом блоке.
6. Для публикации в интернете обязательно **HTTPS** и серверная перепроверка решений. Сейчас ключи идут открытым текстом, а статус решения присылает клиент.

## Чек-лист переноса

- [ ] `npm install`, Node ≥ 20.19
- [ ] Скопировать файлы по списку выше
- [ ] Создать `server/data/roster.txt` → `npm run keys`
- [ ] Проверить, что `.gitignore` содержит `server/data/`
- [ ] `npm test`: все тесты зелёные
- [ ] `npm run dev`: вход студентом, решение работы Emmet, теория, задание на контейнеры, переключение «Браузер / Схема»
- [ ] `/admin`: сводка, матрица, карточка студента, CSV, «Завершить занятие» → у студента появляется «Занятие окончено», «Открыть» → тетрадь возвращается
- [ ] `npm run build && PORT=… npm start`: открыть с другого компьютера в LAN
- [ ] Подключить дизайн из [design/](design/README.md), если проект новый

## Известные ограничения

- Матрица Emmet (30 колонок) на 1366 px не помещается целиком: колонка «Активность» уходит за край, таблица прокручивается по горизонтали.
- Тёмной темы нет.
- Сервер не перепроверяет правильность решения.
