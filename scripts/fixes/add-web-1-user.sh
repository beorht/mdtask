#!/usr/bin/env bash
# Добавить ОДНОГО студента в группу web-1 стандартным паролем (std-snrg) через ШТАТНЫЙ слой БД
# проекта (src/db.createUser → корректный scrypt-хеш, совместимый с входом на сайт и с ib/).
#
# Скрипт НИЧЕГО в БД не чинит и не перестраивает — только добавляет одну строку в users.
# Перед вставкой делает резервную копию файла БД (на всякий случай, не для «починки»).
#
# Запуск из каталога проекта (на сервере — /root/mdtask). Служба mdtask ДОЛЖНА БЫТЬ ОСТАНОВЛЕНА,
# иначе возможен SQLITE_BUSY (демон держит БД). Обёртка update-admin-panel.sh останавливает её сама.
#
# Использование:
#   bash scripts/fixes/add-web-1-user.sh [ID]
#     ID              логин нового студента (по умолчанию stWeb-017)
#   NU_NAME="Имя"     имя (по умолчанию «Тестов Тест»)
#   MUST_CHANGE=1     заставить сменить пароль при первом входе (по умолчанию 0 — std-snrg остаётся рабочим)
#   DB_PATH=путь      путь к БД (по умолчанию data/mdtask.db)
set -euo pipefail

ID="${1:-stWeb-017}"
NAME="${NU_NAME:-Тестов Тест}"
MUST="${MUST_CHANGE:-0}"
DB="${DB_PATH:-data/mdtask.db}"

[ -f index.js ] || { echo "Запустите из каталога проекта (где index.js), напр. /root/mdtask" >&2; exit 2; }
[ -f "$DB" ]     || { echo "Нет файла БД: $DB" >&2; exit 2; }

# Резервная копия БД (не починка — просто копия на случай отката)
mkdir -p backups
cp "$DB" "backups/mdtask-before-add-user-$(date +%F-%H%M%S).db"
echo "Бэкап БД сделан в backups/"

DB_PATH="$DB" NU_ID="$ID" NU_NAME="$NAME" NU_MUST="$MUST" node -e '
const db = require("./src/db");
const { DEFAULT_PASSWORD } = require("./src/lib/password");
const id = process.env.NU_ID, name = process.env.NU_NAME;
if (db.getUserById(id)) {
  console.error("Пользователь с логином " + id + " уже существует — ничего не добавляю. Задайте другой: bash scripts/fixes/add-web-1-user.sh stWeb-018");
  process.exit(4);
}
db.createUser({ id, role: "student", name, group: "web-1", mustChangePassword: process.env.NU_MUST === "1" });
console.log("Добавлен студент:");
console.log("  логин:  " + id);
console.log("  имя:    " + name);
console.log("  группа: web-1");
console.log("  пароль: " + DEFAULT_PASSWORD);
console.log("  смена пароля при входе: " + (process.env.NU_MUST === "1" ? "да" : "нет"));
'
