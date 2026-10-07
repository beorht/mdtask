# Структура проекта mdtask

Актуально на 2026-09-27. Полное дерево файлов (кроме `node_modules/`, `.git/`,
`data/`, `uploads/` — генерируются в рантайме, не хранятся в репозитории) и
краткое назначение каждой области. Функциональное описание фич — в
[README.md](../README.md); здесь — именно карта файлов.

```
mdtask/
├── index.js                      # точка входа: createApp() из src/server.js + app.listen()
├── package.json / package-lock.json
├── .gitignore
├── README.md
│
├── docs/
│   ├── plan.md                            # исходное ТЗ проекта (RU)
│   ├── STRUCTURE.md                       # этот файл
│   ├── interfeyc.md                       # план развития в интерактивную платформу
│   ├── color-white.md / color-dark.md     # планы внедрения цветовых палитр (светлая/тёмная)
│   ├── lectures/sql/*.pdf                 # раздаточный материал по SQL (primary/foreign key, join)
│   └── superpowers/
│       ├── plans/2026-09-09-ui-prototype.md
│       └── specs/2026-09-09-ui-prototype-design.md
│
├── src/
│   ├── server.js                 # фабрика Express-приложения (createApp), монтирует все роутеры
│   │
│   ├── db/
│   │   ├── schema.sql             # CREATE TABLE: users, courses, assignments, submissions,
│   │   │                          #   sql_exercises, sql_attempts, language_exercises + индексы
│   │   ├── index.js                # весь доступ к БД: подключение, миграции ALTER TABLE
│   │   │                          #   (addColumnIfMissing), prepared-statement кэш (prepared()),
│   │   │                          #   CRUD-функции для users/courses/assignments/submissions,
│   │   │                          #   sql_exercises/sql_attempts, language_exercises,
│   │   │                          #   __resetForTests()
│   │   ├── seed.js                 # сид пользователей/курса при первом запуске (пустая БД)
│   │   ├── seed-sql-exercises.js   # сид 90 упражнений SQL-тренажёра
│   │   ├── seed-language-exercises.js
│   │   ├── sql-exercises-data.js   # контент 90 SQL-упражнений (данные, не код)
│   │   └── language-exercises-data.js  # контент 24 заданий по Python/JS (данные, не код)
│   │
│   ├── lib/
│   │   ├── markdown.js             # markdown-it + heading id / slugify (транслитерация RU→lat)
│   │   ├── summary-parser.js       # парсинг content/SUMMARY.md → дерево (mdBook-формат)
│   │   ├── summary-writer.js       # запись новой записи в SUMMARY.md (создание задания)
│   │   ├── sidebar.js              # сборка дерева для левого сайдбара (роль-зависимая фильтрация)
│   │   ├── password.js             # scrypt-хеширование пароля (без сторонних зависимостей)
│   │   ├── sql-sandbox.js          # выполнение SQL-запроса студента в изолированном .db-файле
│   │   └── sql-topics.js           # метаданные тем SQL-тренажёра (порядок, заголовки)
│   │
│   ├── content/
│   │   └── sql-theory.js           # конспект теории по темам SQL (для /trainer/theory)
│   │
│   ├── middleware/
│   │   └── auth.js                 # requireAuth / requireRole(role) — включая редирект
│   │                                #   на /change-password при must_change_password
│   │
│   ├── routes/
│   │   ├── auth.js                 # GET/POST /login, GET/POST /change-password, POST /logout
│   │   ├── student.js              # GET /, GET /assignment/:id, POST /assignment/:id/submit
│   │   ├── teacher.js              # /teacher*, /teacher/courses/:id/assignments(/new),
│   │   │                          #   /teacher/assignment/:id/{edit,save,submissions,...},
│   │   │                          #   POST /api/preview (live-превью markdown)
│   │   └── trainer.js              # /trainer* (теория, практика, история попыток),
│   │                                #   /teacher/trainer/results* (сводка для преподавателя)
│   │
│   └── views/
│       ├── login.ejs / change-password.ejs
│       ├── student-home.ejs (главная без сайдбара) / subject-sql.ejs / subject-language.ejs / bank-exercise.ejs / assignment-view.ejs
│       ├── teacher-dashboard.ejs / assignment-editor.ejs / assignment-new.ejs
│       ├── submissions-table.ejs
│       ├── 403.ejs / 404.ejs
│       ├── partials/
│       │   ├── head.ejs / header.ejs / scripts.ejs / sidebar.ejs
│       └── trainer/
│           ├── theory-index.ejs / theory.ejs
│           ├── practice-index.ejs / practice.ejs / exercise.ejs
│           ├── attempt-history.ejs
│           └── results.ejs         # сводная таблица результатов для преподавателя
│
├── content/                        # контент заданий как настоящий mdBook-проект
│   ├── SUMMARY.md                  # оглавление (дерево разделов/заданий)
│   └── src/
│       ├── section-obekty-i-slovari/   # раздел "Объекты и словари": теория + 15 задач (Python)
│       ├── section-razdel-1/           # ⚠ похоже на тестовый/черновой раздел, см. ниже
│       ├── individual/                 # индивидуальные задания, по подпапке на студента
│       └── test-*/                     # ⚠ каталоги test-assignment-view, test-smoke,
│                                        #   test-teacher-editor — похожи на артефакты
│                                        #   ручного/тестового прогона, а не реальный контент
│
├── public/
│   ├── css/
│   │   ├── theme.css               # CSS-переменные (палитра, светлая/тёмная тема), типографика
│   │   ├── components.css          # стили компонентов (сайдбар, карточки, кнопки, формы, ...)
│   │   └── code-theme.css          # подсветка синтаксиса кода (highlight.js)
│   ├── js/
│   │   ├── theme-toggle.js         # переключение и сохранение темы
│   │   ├── sidebar.js              # мобильное гамбургер-меню
│   │   ├── tabs.js                 # вкладки "Основная сдача/Пересдача" + реальный upload-виджет
│   │   └── editor-preview.js       # live-превью markdown в редакторе преподавателя
│   └── images/theory/*.png         # иллюстрации к теории (foreign key)
│
├── ib/                           # раздел «Информационная безопасность» (перенесён из IBEmulator один в один)
│   ├── server/                   # backend терминала на Python stdlib: app.py (bash/sqlite3-эмуляция, handle_api),
│   │                             #   sqlite_shell.py, protected_db.py, bridge.py (мост для Node, src/lib/ib-bridge.js)
│   ├── prototype/terminal-lab.html   # веб-терминал (TTY), встраивается на /subjects/ib/<task>
│   ├── ctf/caesar-secret/        # генератор задания №3 (пароли, шифр Цезаря, песочницы data/ctf/caesar/)
│   ├── checks/ / task/ / docs/   # чекеры №1/№2, инструкции к заданиям, план курса
│   └── admin-panel/              # демо-панель IBEmulator (реальные результаты — /admin/ib)
│
├── tests/                          # node:test + supertest, 91/91 на момент README
│   ├── server.test.js
│   ├── db/index.test.js
│   ├── lib/
│   │   ├── markdown.test.js / sidebar.test.js
│   │   ├── summary-parser.test.js / summary-writer.test.js
│   │   └── sql-sandbox.test.js
│   ├── routes/
│   │   ├── auth.test.js / student.test.js / smoke.test.js
│   │   ├── teacher.test.js / teacher-editor.test.js / teacher-new-assignment.test.js
│   │   ├── teacher-submissions.test.js / upload.test.js
│   │   ├── assignment-view.test.js / trainer.test.js
│   └── helpers/fixtures.js         # общие фабрики тестовых данных (seedAssignment и т.п.)
│
└── backups/                        # ⚠ рабочие бэкапы, не часть кодовой базы приложения
    ├── student-accounts.md         # выгрузка учётных данных студентов
    └── trainer/<studentId>/*.db    # снятые копии SQLite-песочниц SQL-тренажёра по студентам
```

## Как читать роуты

Все роутеры монтируются в `src/server.js` в таком порядке: `auth` → `student`
→ `teacher` → `trainer`, затем общий 404-обработчик. Полный список
эндпоинтов с методами и требуемой ролью можно получить так:

```bash
grep -n "router\.\(get\|post\)" src/routes/*.js
```

## Модель данных (`src/db/schema.sql`)

| Таблица | Назначение |
|---|---|
| `users` | студенты/преподаватели: роль, группа (`student_group`), пароль (scrypt-хеш + соль), `must_change_password` |
| `courses` | курс → преподаватель |
| `assignments` | задание: `md_path` (файл в `content/src`), `target_type` (group/individual), `target_student_id`, `target_group` (NULL = все группы), `due_date` |
| `submissions` | сдача: файлы (`files`/`stored_files`), статус (pending/done/not_done), комментарий, `parent_submission_id` — цепочка пересдач |
| `sql_exercises` | 90 упражнений SQL-тренажёра: тема, условие, схема, разрешённый оператор, тип проверки |
| `sql_attempts` | история попыток решения SQL-упражнений (включая ошибочные) |
| `language_exercises` | 24 задания по Python/JS — только контент, без автопроверки |

## Замечания при составлении карты

- В `content/src/` рядом с реальным разделом `section-obekty-i-slovari`
  обнаружены каталоги `test-assignment-view`, `test-smoke`,
  `test-teacher-editor` и `section-razdel-1`, которые выглядят как остатки
  тестовых/отладочных прогонов, а не учебный контент. Они закоммичены (не
  просто локальный мусор) — стоит решить, оставлять их или почистить.
- `backups/` занимает основную часть репозитория по числу файлов (сотни
  `.db`-снимков песочниц студентов) — это рабочие данные, а не код проекта;
  в дереве выше показан только один уровень, без перечисления всех файлов.
