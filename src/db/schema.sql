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
