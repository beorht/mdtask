-- Отдельная таблица для №3. Второй (скрытый) пароль каждого студента,
-- зашифрованный шифром Цезаря. Не связана с обычным логином/паролем
-- в таблице users — тот остаётся как есть и не используется этим заданием
-- для проверки, только как способ первого входа на платформу.

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
  -- 'password': cipher_text = зашифрованный пароль;
  -- 'path': cipher_text = зашифрованный путь к password_file_path, где пароль открытым текстом
  variant TEXT NOT NULL DEFAULT 'password',
  password_file_path TEXT
);

CREATE INDEX IF NOT EXISTS idx_ctf_caesar_secrets_student ON ctf_caesar_secrets(student_id);
