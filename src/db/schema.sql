CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  name TEXT NOT NULL,
  student_group TEXT
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
  due_date TEXT NOT NULL
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
CREATE INDEX IF NOT EXISTS idx_sql_attempts_exercise_student ON sql_attempts(exercise_id, student_id);
