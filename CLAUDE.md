# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

mdtask is a practice-assignment platform for a college course: teachers publish Markdown assignments, students upload solution archives, and an interactive SQL trainer runs student queries against per-student SQLite sandboxes. It is server-rendered Express 5 + EJS. There is no build step, no frontend framework, no ORM and no linter. All user-facing text (UI, content, exercise descriptions, theory) is in Russian. Keep it in Russian.

`ib/` is a separate sub-project (the "Информационная безопасность" subject, formerly IBEmulator, Python stdlib). It has its own `ib/CLAUDE.md`, so read that before touching anything under `ib/`.

## Commands

```bash
npm start                 # node index.js, http://localhost:42521
npm run dev               # node --watch on src/, public/, index.js
npm test                  # all tests: node:test + supertest, then the ib/ Python suite (npm run test:ib)
# Single test file / single test (env vars from the npm script are required):
DB_PATH=:memory: TRAINER_DB_DIR=/tmp/mdtask-trainer-test UPLOAD_DIR=/tmp/mdtask-uploads-test node --test tests/lib/sql-join-topic.test.js
DB_PATH=:memory: TRAINER_DB_DIR=/tmp/mdtask-trainer-test UPLOAD_DIR=/tmp/mdtask-uploads-test node --test --test-name-pattern="JOIN topic" tests/lib/sql-join-topic.test.js
```

Env vars: `PORT` (42521), `DB_PATH` (`data/mdtask.db`), `TRAINER_DB_DIR` (`data/trainer`), `UPLOAD_DIR`, `CTF_CAESAR_DIR` (`data/ctf/caesar`), `CTF_CONFIGS_DIR` (`data/ctf/configs`), `CTF_TERMINAL_DIR` (`data/ctf/terminal`), `CTF_LABS_DIR` (`data/ctf`, tasks №6–7), `IB_PYTHON` (`python3`).

## Real data: be careful

`data/mdtask.db`, `data/trainer/`, `data/ctf/` and `uploads/` hold **real student accounts and submissions**. Never delete or reset them. Tests must always run with `DB_PATH=:memory:` and temp dirs (the `npm test` script sets these). For UI checks with fake data, copy the DB somewhere else and run a second instance on another port with `DB_PATH`/`UPLOAD_DIR`/`TRAINER_DB_DIR` pointing at the copy. `backups/` holds manual snapshots of real data.

## Architecture

**App and routing.** `index.js` calls `createApp()` from `src/server.js`, which mounts the routers in `src/routes/`. Mount order matters: `ib` is mounted before `student` so that `/subjects/ib` isn't caught by `/subjects/:key`. Auth is session-based: `requireAuth`/`requireRole(role)` in `src/middleware/auth.js` also force-redirect to `/change-password` while `users.must_change_password = 1`. Passwords use `crypto.scryptSync` (`src/lib/password.js`). The format must stay byte-compatible with `ib/server/app.py`, which verifies the same hashes. The shared default password is `DEFAULT_PASSWORD`.

**Teacher UI is `/admin` only.** It lives in `src/routes/admin.js`, `src/lib/admin-data.js` (status rules, review queue, overdue), `src/lib/admin-view.js` and `src/views/admin/`, plus the self-contained `public/css/admin.css` and `public/js/admin.js` (admin pages don't load `theme.css`/`components.css`). `src/routes/teacher.js` now only redirects old `/teacher/...` URLs and hosts `POST /api/preview` (the Markdown preview).

**Database (`src/db/`).** All DB access goes through `src/db/index.js`, which uses raw SQL with a module-level prepared-statement cache (`prepared()`).
- On every startup, `index.js` applies `schema.sql`, then runs migrations as `addColumnIfMissing(...)` calls (there's no migration framework), then the seeders.
- `seed.js` only fills an empty DB.
- `seedSqlExercises` / `seedLanguageExercises` use `INSERT OR IGNORE` on every start, so new exercises reach existing DBs. **Existing exercise rows are never updated**: if you change an already-seeded exercise, the real DB keeps the old row unless you migrate it explicitly.
- Tests call `db.__resetForTests()` in `beforeEach`.

**Assignments.** Assignment Markdown lives on disk in `content/src/**.md`, indexed by the mdBook-style `content/SUMMARY.md`. It is parsed by `src/lib/summary-parser.js`, written by `summary-writer.js`, and create/edit logic is in `src/lib/assignment-content.js`. Targeting rules:
- `target_type` is either `individual` or `group`.
- `target_group` = `NULL` means the assignment goes to all groups.
- Groups come from distinct `users.student_group` values, not a hardcoded list.
- The visibility rule is duplicated in `getAssignmentsForStudent` (db), `src/lib/sidebar.js` and `canAccessAssignment` in `src/routes/student.js`. Keep all three in sync.
- The "На пересдачу" verdict means `not_done` + `submissions.resubmit_allowed = 1`, which lets the student upload past the due date (`canSubmit`). Keep it consistent with the admin "Просрочено" logic.
- Group `TEST` (`src/lib/test-access.js`, `hasFullAccess`) sees every group's assignments and the whole trainer unlocked, and is hidden from teacher group targeting.
- **Course subjects** (`COURSE_SUBJECTS` in `src/lib/subjects.js`, first: `pis` «Проектирование информационных систем»): an assignment with `assignments.subject = <key>` belongs to that subject — its own home card, `/subjects/<key>` page (`subject-course.ejs`), sidebar (`courseSubjectNav`) and theory pages `/subjects/<key>/theory/<slug>` (Markdown in `content/<key>/theory/`, images in `public/img/<key>/`); such assignments are excluded from Python/JavaScript (subject `NULL`). The subject is visible only to students who have one of its assignments. `assignments.upload_types` (JSON list of extensions, `NULL` = `.zip/.rar`) sets what the upload accepts (`uploadTypesOf`, `DIAGRAM_TYPES` for drawings); rejected files redirect with `?upload=bad`. Multer uses `defParamCharset: 'utf8'` so Cyrillic file names survive. The admin review page shows uploaded images/PDFs inline (`?inline=1`). There's no admin UI for subject/upload types yet (set via `setAssignmentSubject`).
- **Editor assignments**: `assignments.code_files` (JSON list, e.g. `["mydb.py","main.py"]`, set with `setAssignmentCodeFiles`; NULL = archive upload) turns the assignment page into an on-site Python editor (`public/js/code-editor.js`, CodeMirror from cdnjs). «Запустить» runs `main.py` in the student's browser via Pyodide in a Web Worker (`public/js/python-worker.js`; `sqlite3` loaded, fresh working dir per run, 15 s limit, `input()` disabled), so the server never executes student code. Drafts autosave to `code_drafts`; «Сдать» packs the files into `solution.zip` (`src/lib/code-submission.js`), which the admin review page previews like any uploaded archive. Archive upload is refused for such assignments. There's no admin UI to toggle it yet.

**SQL trainer** (`src/routes/trainer.js`, `src/lib/sql-sandbox.js`). Each run recreates `TRAINER_DB_DIR/<studentId>/<exerciseId>.db` from the exercise's `schemaSql`, checks that the statement type equals `allowed_statement` (one statement per run unless `allowedStatements` is set, see below), executes it, and compares the result. There are two check types: `select_match` compares result rows (column names included, order only if `orderMatters`), and `state_check` compares the table state after the query. Exercises unlock in `order_index` order (`src/lib/sql-progress.js`). Every attempt is stored in `sql_attempts`.
- An exercise may set `requiredKeyword` (column `sql_exercises.required_keyword`, e.g. `'JOIN'`): a correct result whose query lacks that keyword (outside strings and comments) is not accepted, and the student sees why.
- An exercise may set `allowedStatements` (column `sql_exercises.allowed_statements`, JSON list of types): it then accepts several statements separated by `;` (`splitStatements`, outside strings/comments), run in order; an error names the statement («Оператор №N»), `select_match` compares the last SELECT, `state_check` the state after all of them. `allowedStatement` stays the main type (used by `describeExpected`). Without it, exactly one statement.
- `seedSqlExercises` also moves existing rows to the `order_index` from the data files (`syncOrderIndexes`), so exercises can be inserted mid-chain (later topics derive `FIRST_ORDER_INDEX` from the previous file). A solved exercise always stays unlocked (`withProgress`).
- `src/lib/sql-mistakes.js` classifies wrong attempts (UNIQUE/FK, wrong column with suggestion, placeholder, value not in data, a subquery column silently taken from the outer query, guessing, resending…). Students see «Разбор ваших попыток» on a solved exercise; the admin shows it on `/admin/trainer/:student/:exercise` and aggregates it on `/admin/trainer/mistakes`.
- Topics with `section: 'practicum'` in `TOPICS` are shown as a separate «Практикум» block (`groupBySection`) in the sidebar, `/subjects/sql`, `/trainer` and `/trainer/theory`. They continue the same unlock chain. The first one is `keys_join` (PRIMARY/FOREIGN KEY + JOIN, `src/db/sql-exercises-keys-join-data.js`, `keys-1`…`keys-12`, order 138–149). Its theory (`src/content/sql-theory-keys-join.js`) has a worked example per task; the examples must not contain a task's reference solution, which a test checks.

Adding a trainer topic touches several files:
1. Add `{ key, label }` to `TOPICS` in `src/lib/sql-topics.js`. This list drives the sidebar and the topic order. Topics can be theory-only.
2. Add theory as `src/content/sql-theory-<topic>.js` and merge it into `TOPIC_THEORY` with the `Object.assign` lines at the bottom of `src/content/sql-theory.js`.
3. Add practice as `src/db/sql-exercises-<topic>-data.js` and register it in `ALL_EXERCISES` in `src/db/seed-sql-exercises.js`.
   - Newer data files (query/relations/join) define a reference `solution` per exercise and compute `expectedResult` at load time by running it on the schema in in-memory SQLite.
   - `order_index` continues from the previous file (`FIRST_ORDER_INDEX`).
4. Add a test like `tests/lib/sql-<topic>-topic.test.js`, which checks topic order, theory content and that each reference solution passes `checkSolution`.

**IB subject.** `src/lib/ib-bridge.js` spawns one long-lived `python3 ib/server/bridge.py` child and talks to it with JSON lines over stdin/stdout. `src/routes/ib.js` serves `ib/prototype/terminal-lab.html` and proxies `/ib/<task>/api/*` (the login call carries the task key, which picks the sandbox). The task list is in `src/lib/ib-tasks.js`: task №3 `caesar` (status in `ctf_caesar_secrets`), task №4 `configs` (find/grep/sed on a generated server tree, status and progress in `ib_config_tasks`), task №5 `terminal` (a 14-stage trainer for basic commands, progress in `ib_terminal_tasks`, every command line in `ib_terminal_log`), and tasks №6 `incident` (incident response from logs) and №7 `ssh` (secure SSH access), both on the shared stage engine `ib/server/lab_task.py` (rows in `ib_lab_tasks`, log in `ib_lab_log`, `lab: true` and `stages` in `ib-tasks.js`, sandboxes in `data/ctf/incident|ssh/`, `CTF_LABS_DIR`). A task with `theory` (Markdown under `ib/`) gets `/subjects/ib/<task>/theory`, and its card opens the theory first. Per-task `hint` and `progressUnit` in `ib-tasks.js` feed the task page. The №5 stage titles are duplicated in `ib-tasks.js` (`stages`), and a test keeps them equal to `ib/server/terminal_task.py`. Terminal sessions live in the Python process and are lost on restart. Teacher results for all tasks are on `/admin/ib`; `/admin/ib/terminal/:id` shows one student's №5 stages, answers and command log, and `/admin/ib/lab/:task/:id` does the same for №6–7 (same `ib-terminal.ejs`, generic `stageTaskResults`/`stageTaskDetail` in `admin-data.js`).

**Frontend.** Plain CSS/JS in `public/`. Student pages use `theme.css` + `components.css` with light/dark theming (`theme-toggle.js`, palettes in `docs/color-*.md`).

## Working conventions

- After changing anything under `src/`, `public/` or `content/`, restart the running server and verify it:
  ```bash
  lsof -ti:42521 -sTCP:LISTEN | xargs -r kill
  nohup env DB_PATH=./data/mdtask.db TRAINER_DB_DIR=./data/trainer PORT=42521 node index.js > /tmp/mdtask-server.log 2>&1 & disown
  curl localhost:42521/health
  ```
  Don't use `pkill -f "node index.js"`, because it matches and kills the calling shell.
- Route tests that need assignment Markdown write real files under `content/src` through `tests/helpers/fixtures.js` (`writeAssignmentMd` / `cleanupContentFiles`). Use those helpers so test runs leave no files behind.
- `docs/plan.md` is the original spec (RU), and `docs/STRUCTURE.md` is a file map. Both may lag behind the code.
