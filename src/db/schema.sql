CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  name TEXT NOT NULL,
  student_group TEXT,
  password_hash TEXT,
  password_salt TEXT,
  must_change_password INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  teacher_id TEXT NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id),
  title TEXT NOT NULL,
  md_path TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('group', 'individual')),
  target_student_id TEXT REFERENCES users(id),
  target_group TEXT,
  due_date TEXT NOT NULL
);

-- Unsent work of an editor assignment (assignments.code_files): the student's current
-- code, autosaved from the browser; a submit packs it into solution.zip.
CREATE TABLE IF NOT EXISTS code_drafts (
  assignment_id TEXT NOT NULL REFERENCES assignments(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  files TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  PRIMARY KEY (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES assignments(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  files TEXT NOT NULL DEFAULT '[]',
  stored_files TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'not_done')),
  comment TEXT,
  submitted_at TEXT,
  checked_at TEXT,
  checked_by TEXT,
  parent_submission_id TEXT REFERENCES submissions(id)
);

CREATE TABLE IF NOT EXISTS sql_exercises (
  id TEXT PRIMARY KEY,
  order_index INTEGER NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  description_md TEXT NOT NULL,
  schema_sql TEXT NOT NULL DEFAULT '',
  allowed_statement TEXT NOT NULL,
  check_type TEXT NOT NULL CHECK (check_type IN ('select_match', 'state_check')),
  checker_sql TEXT,
  order_matters INTEGER NOT NULL DEFAULT 0,
  -- an SQL keyword the solution must contain (e.g. 'JOIN'), NULL = any query with the right result
  required_keyword TEXT,
  -- JSON list of statement types for exercises that accept several statements (`;`), NULL = one
  allowed_statements TEXT,
  expected_result TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sql_attempts (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES sql_exercises(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  submitted_sql TEXT NOT NULL,
  is_error INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  is_correct INTEGER NOT NULL DEFAULT 0,
  result_columns TEXT,
  result_rows TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_student ON submissions(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_sql_attempts_exercise_student ON sql_attempts(exercise_id, student_id);

-- Content-only bank of practice tasks for general-purpose languages (Python, JS, ...).
-- Unlike sql_exercises, these have no execution/checker sandbox — they're reference
-- material a teacher assigns and reviews manually, not an auto-graded trainer.
CREATE TABLE IF NOT EXISTS language_exercises (
  id TEXT PRIMARY KEY,
  language TEXT NOT NULL CHECK (language IN ('python', 'javascript')),
  order_index INTEGER NOT NULL,
  topic TEXT NOT NULL,
  topic_label TEXT NOT NULL,
  title TEXT NOT NULL,
  description_md TEXT NOT NULL,
  UNIQUE (language, order_index)
);
CREATE INDEX IF NOT EXISTS idx_users_student_group ON users(student_group);
-- idx_assignments_target_group lives in db/index.js, run *after* addColumnIfMissing —
-- creating it here would fail on a pre-existing database where schema.sql's own
-- CREATE TABLE IF NOT EXISTS is a no-op and the column doesn't exist yet.

-- Задание «Доступ к защищённой базе данных» (ib/, перенесено из IBEmulator): пароль от
-- защищённой базы студента, зашифрованный шифром Цезаря. Заполняет генератор
-- ib/ctf/caesar-secret/generate_challenge.py, solved ставит терминал (ib/server/app.py).
-- Для входа на платформу этот пароль не подходит.
CREATE TABLE IF NOT EXISTS ctf_caesar_secrets (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  caesar_shift INTEGER NOT NULL,
  plain_password TEXT NOT NULL,
  cipher_text TEXT NOT NULL,
  hidden_file_path TEXT NOT NULL,
  solved INTEGER NOT NULL DEFAULT 0,
  solved_at TEXT,
  created_at TEXT NOT NULL,
  -- 'password': cipher_text — зашифрованный пароль; 'path': зашифрованный путь к
  -- password_file_path, где пароль лежит открытым текстом
  variant TEXT NOT NULL DEFAULT 'password',
  password_file_path TEXT
);
CREATE INDEX IF NOT EXISTS idx_ctf_caesar_secrets_student ON ctf_caesar_secrets(student_id);

-- Задание «Поиск и правка конфигурационных файлов» (ib/, задание №4): личные значения студента
-- (params, JSON: ssh_port, apache_port, upload_max, хеши файлов-обманок) и прогресс автопроверки.
-- Заполняет ib/ctf/configs/generate_configs.py, прогресс пишет терминал (ib/server/config_task.py).
CREATE TABLE IF NOT EXISTS ib_config_tasks (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  params TEXT NOT NULL,
  passed INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  solved INTEGER NOT NULL DEFAULT 0,
  solved_at TEXT,
  checked_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ib_config_tasks_student ON ib_config_tasks(student_id);

-- Задание «Основы работы в терминале Linux» (ib/, задание №5, тренажёр): личные значения студента
-- (params, JSON) и прогресс по этапам (progress, JSON: done, opened, completed_at, answers, attempts).
-- Заполняет ib/ctf/terminal/generate_terminal.py, прогресс пишет терминал (ib/server/terminal_task.py).
CREATE TABLE IF NOT EXISTS ib_terminal_tasks (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  params TEXT NOT NULL,
  progress TEXT NOT NULL DEFAULT '{}',
  passed INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  solved INTEGER NOT NULL DEFAULT 0,
  solved_at TEXT,
  checked_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ib_terminal_tasks_student ON ib_terminal_tasks(student_id);

-- Журнал команд тренажёра: raw — что набрал студент, line — после !! / !N, cmds — выполненные
-- команды (argv, каталог до и после, код возврата, sudo). По нему проверяются этапы «выполните команду».
CREATE TABLE IF NOT EXISTS ib_terminal_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  raw TEXT NOT NULL,
  line TEXT NOT NULL,
  cmds TEXT NOT NULL DEFAULT '[]',
  status INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ib_terminal_log_student ON ib_terminal_log(student_id, id);

-- Пошаговые задания ib/ на общем движке ib/server/lab_task.py (№6 incident, №7 ssh): одна строка на
-- задание и студента (task), params/progress — как у ib_terminal_tasks. Заполняют генераторы
-- ib/ctf/<задание>/generate_*.py, прогресс пишет терминал.
CREATE TABLE IF NOT EXISTS ib_lab_tasks (
  id TEXT PRIMARY KEY,
  task TEXT NOT NULL,
  student_id TEXT NOT NULL REFERENCES users(id),
  params TEXT NOT NULL,
  progress TEXT NOT NULL DEFAULT '{}',
  passed INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  solved INTEGER NOT NULL DEFAULT 0,
  solved_at TEXT,
  checked_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (task, student_id)
);

-- Журнал команд этих заданий (как ib_terminal_log, плюс task).
CREATE TABLE IF NOT EXISTS ib_lab_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task TEXT NOT NULL,
  student_id TEXT NOT NULL,
  raw TEXT NOT NULL,
  line TEXT NOT NULL,
  cmds TEXT NOT NULL DEFAULT '[]',
  status INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ib_lab_log_task_student ON ib_lab_log(task, student_id, id);

-- Задание ИБ №8 «Расследование по журналам», этап 7: детектор атак на Python (src/lib/ib-detector.js).
-- Код выполняется в браузере, сервер сверяет вывод; defense_ok — контрольный вопрос «что выведет
-- ваша программа» (NULL — ещё не отвечал). Терминал (ib/server/logs_task.py) читает solved.
CREATE TABLE IF NOT EXISTS ib_logs_detector (
  student_id TEXT PRIMARY KEY REFERENCES users(id),
  code TEXT NOT NULL DEFAULT '',
  passed INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  solved INTEGER NOT NULL DEFAULT 0,
  solved_at TEXT,
  checks INTEGER NOT NULL DEFAULT 0,
  defense_ok INTEGER,
  defense_answer TEXT,
  defense_at TEXT,
  updated_at TEXT
);

-- Защита заданий ИБ от решения «через нейросеть» (src/routes/ib.js, public/js/ib-guard.js):
-- заблокированные вставки, копирование, уход со страницы — в терминале и в редакторе детектора.
CREATE TABLE IF NOT EXISTS ib_guard_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task TEXT NOT NULL,
  student_id TEXT NOT NULL,
  type TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ib_guard_events ON ib_guard_events(task, student_id);

-- Контрольные вопросы на сайте после решения заданий ИБ без движка этапов (№3, №4; src/lib/ib-defense.js):
-- questions — [{text, options, correct}], results — [{choice, ok, late, seconds, at}], asked_at — когда
-- показан текущий вопрос (60 секунд на ответ).
CREATE TABLE IF NOT EXISTS ib_task_defense (
  task TEXT NOT NULL,
  student_id TEXT NOT NULL REFERENCES users(id),
  questions TEXT NOT NULL,
  results TEXT NOT NULL DEFAULT '[]',
  asked_at TEXT,
  finished_at TEXT,
  PRIMARY KEY (task, student_id)
);

-- «Простое программирование на Python» (курс убран с сайта 26.10.2026, материал и код — docs/archive/pybasics/):
-- черновик кода и итог по заданию для студента. Таблицы оставлены, чтобы не потерять результаты студентов.
CREATE TABLE IF NOT EXISTS python_basics_progress (
  student_id TEXT NOT NULL REFERENCES users(id),
  task_id TEXT NOT NULL,
  draft TEXT NOT NULL DEFAULT '',
  attempts INTEGER NOT NULL DEFAULT 0,
  best_passed INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  solved_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (student_id, task_id)
);

-- Каждая проверка: код и результат по тестам (JSON: passed, error на каждый тест).
CREATE TABLE IF NOT EXISTS python_basics_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL REFERENCES users(id),
  task_id TEXT NOT NULL,
  code TEXT NOT NULL,
  passed INTEGER NOT NULL,
  total INTEGER NOT NULL,
  results TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_python_basics_attempts_student ON python_basics_attempts(student_id, task_id, id);

-- Итоговая контрольная работа (src/lib/exam/): окно проведения, публикация результатов и
-- отметка, что после окончания неотправленные задания отправлены автоматически.
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  published_at TEXT,
  finalized_at TEXT,
  updated_at TEXT NOT NULL
);

-- Вариант студента: тема, номер в списке группы и зерно, из которого строятся все его данные
-- (журналы, база, тесты); variant — JSON с выбранными алгоритмами и программами с ошибками.
CREATE TABLE IF NOT EXISTS exam_variants (
  exam_id TEXT NOT NULL,
  student_id TEXT NOT NULL REFERENCES users(id),
  theme TEXT NOT NULL,
  seed TEXT NOT NULL,
  variant TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (exam_id, student_id)
);

-- Состояние каждого задания контрольной у студента. answer — последний ответ (флаг, SQL) или
-- окончательный код; result — JSON последней проверки; runs — запуски программы с ошибкой;
-- submitted_at/submit_kind — единственная отправка (manual | runs | timeout); locked — менять нельзя;
-- teacher_score — баллы, поставленные преподавателем (отчёт).
CREATE TABLE IF NOT EXISTS exam_tasks (
  exam_id TEXT NOT NULL,
  student_id TEXT NOT NULL REFERENCES users(id),
  task_id TEXT NOT NULL,
  draft TEXT NOT NULL DEFAULT '',
  attempts INTEGER NOT NULL DEFAULT 0,
  runs INTEGER NOT NULL DEFAULT 0,
  solved INTEGER NOT NULL DEFAULT 0,
  solved_at TEXT,
  answer TEXT,
  result TEXT,
  submitted_at TEXT,
  submit_kind TEXT,
  locked INTEGER NOT NULL DEFAULT 0,
  teacher_score REAL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (exam_id, student_id, task_id)
);

-- Краткая копия журнала действий для таблиц админки. Полный журнал — файл на каждого студента:
-- data/exam/<exam>/logs/<student>.jsonl (src/lib/exam/log.js).
CREATE TABLE IF NOT EXISTS exam_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  ts TEXT NOT NULL,
  stage INTEGER,
  task TEXT,
  type TEXT NOT NULL,
  summary TEXT
);
CREATE INDEX IF NOT EXISTS idx_exam_events_student ON exam_events(exam_id, student_id, seq);

-- Компьютеры аудитории, с которых разрешено писать итоговую контрольную (src/lib/exam/devices.js):
-- имя, IP и MAC; импорт из data/data_pc_ib.sqlite (scripts/exam/import-pcs.js) или из админки.
CREATE TABLE IF NOT EXISTS exam_pcs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  ip TEXT NOT NULL,
  mac TEXT,
  room TEXT,
  updated_at TEXT NOT NULL
);

-- Входы на сайт (express-session, src/lib/session-store.js): перезапуск сервера не выкидывает студентов.
-- sess — JSON сессии, expires_at — миллисекунды Unix.
CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Тренажёр «Emmet · Тетрадь» (группа WEB, src/lib/emmet/, src/routes/emmet.js): личный набор работ Emmet,
-- статистика по каждой работе (JSON, поля как в docs/emmet/04-data-model.md), журнал событий и
-- «Завершить / Открыть занятие» по группам.
CREATE TABLE IF NOT EXISTS emmet_assignments (
  student_id TEXT PRIMARY KEY,
  ids TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS emmet_progress (
  student_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  stats TEXT NOT NULL,
  solved_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (student_id, exercise_id)
);
CREATE TABLE IF NOT EXISTS emmet_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT,
  client_status TEXT,
  handwritten INTEGER NOT NULL DEFAULT 0,
  kind TEXT,
  ms INTEGER,
  code TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_emmet_events_student ON emmet_events(student_id, id);
CREATE TABLE IF NOT EXISTS emmet_sessions (
  student_group TEXT PRIMARY KEY,
  closed_at TEXT
);

-- Предмет «Web-разработка: HTML» (src/lib/html-course/, src/routes/html-course.js; пока только группа TEST):
-- статистика по каждому шагу (item_id: «<тема>:theory» — теория прочитана, иначе id задания практики; JSON как у
-- emmet_progress) и журнал событий практики (открыл, попытка с кодом и проверкой сервера, вставка, уход со страницы).
CREATE TABLE IF NOT EXISTS html_progress (
  student_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  stats TEXT NOT NULL,
  solved_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (student_id, item_id)
);
CREATE TABLE IF NOT EXISTS html_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT,
  client_status TEXT,
  kind TEXT,
  ms INTEGER,
  code TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_html_events_student ON html_events(student_id, id);

-- Предмет «Web-разработка: CSS» (src/lib/css-course/, src/routes/css-course.js):
-- статистика по каждому шагу (item_id: «<тема>:theory» — теория прочитана, иначе id задания практики; JSON как у
-- emmet_progress) и журнал событий практики (открыл, попытка с кодом и проверкой сервера, вставка, уход со страницы).
CREATE TABLE IF NOT EXISTS css_progress (
  student_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  stats TEXT NOT NULL,
  solved_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (student_id, item_id)
);
CREATE TABLE IF NOT EXISTS css_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT,
  client_status TEXT,
  kind TEXT,
  ms INTEGER,
  code TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_css_events_student ON css_events(student_id, id);

-- Курс «Начальный Python» в предмете Python (src/lib/python-course/, src/routes/python-course.js; пока только TEST):
-- прогресс по шагам (item_id: «<урок>:theory» — теория прочитана, иначе id задачи; черновик кода; stats — JSON:
-- попытки, лучший результат, вставки, уходы со страницы) и каждая проверка (код, тесты, запрещённые конструкции).
CREATE TABLE IF NOT EXISTS python_course_progress (
  student_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  draft TEXT,
  stats TEXT NOT NULL DEFAULT '{}',
  solved_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (student_id, item_id)
);
CREATE TABLE IF NOT EXISTS python_course_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  code TEXT NOT NULL,
  passed INTEGER NOT NULL,
  total INTEGER NOT NULL,
  forbidden TEXT NOT NULL DEFAULT '[]',
  results TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_python_course_attempts ON python_course_attempts(student_id, task_id, id);
