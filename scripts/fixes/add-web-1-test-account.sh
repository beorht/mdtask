#!/usr/bin/env bash
# Добавить ещё один аккаунт в группу web-1 со стандартным паролем (std-snrg), имя «Тестов Тест».
# Через sqlite3. Пара соль+хеш сгенерирована модулем проекта src/lib/password.js для пароля std-snrg
# (scrypt), поэтому вход проверяется штатно. Перед записью делает бэкап БД.
#
# Использование (из каталога проекта, напр. /root/mdtask):
#   bash scripts/fixes/add-web-1-test-account.sh            # id по умолчанию stWeb-test
#   bash scripts/fixes/add-web-1-test-account.sh stWeb-900  # свой id
#   DB=/root/mdtask/data/mdtask.db bash scripts/fixes/add-web-1-test-account.sh
set -euo pipefail

DB="${DB:-data/mdtask.db}"
ID="${1:-stWeb-test}"
NAME="Тестов Тест"
GROUP="web-1"
# Стандартный пароль std-snrg. Пара соль+хеш (scrypt, 64 байта) для него:
SALT="da9fbb6c4168e6ca1fb945e3ce1559e7"
HASH="2509ef419b4cf437e8e2caa36140f126352f639fa96041d9637bd49bfe548c971c3f3547e7a5d9c63c8c59d9e2c6768d43d37b759295f2da79e24d0e1146c492"
# 0 — пароль std-snrg остаётся рабочим (удобно для тестового аккаунта);
# 1 — студента заставят сменить пароль при первом входе (как у обычных новых аккаунтов).
MUST_CHANGE="${MUST_CHANGE:-0}"

[ -f "$DB" ] || { echo "Нет файла БД: $DB (запустите из каталога проекта или задайте DB=путь)" >&2; exit 1; }
command -v sqlite3 >/dev/null || { echo "Не найден sqlite3. Установите: apt install sqlite3" >&2; exit 1; }

# Такой id уже есть?
EXISTS="$(sqlite3 "$DB" "SELECT count(*) FROM users WHERE id='$ID';")"
if [ "$EXISTS" != "0" ]; then
  echo "Пользователь с id '$ID' уже существует — ничего не делаю. Задайте другой id: bash $0 stWeb-901" >&2
  exit 1
fi

mkdir -p "$(dirname "$DB")/../backups" 2>/dev/null || mkdir -p backups
BACKUP="$(dirname "$DB")/../backups/mdtask-before-add-$(date +%F-%H%M%S).db"
cp "$DB" "$BACKUP"
echo "Бэкап БД: $BACKUP"

sqlite3 "$DB" <<SQL
INSERT INTO users (id, role, name, student_group, password_hash, password_salt, must_change_password)
VALUES ('$ID', 'student', '$NAME', '$GROUP', '$HASH', '$SALT', $MUST_CHANGE);
SQL

echo "Готово. Добавлен аккаунт:"
sqlite3 -header -column "$DB" "SELECT id, name, student_group AS груп, must_change_password AS смена_пароля FROM users WHERE id='$ID';"
echo
echo "Вход: ID = $ID,  пароль = std-snrg"
