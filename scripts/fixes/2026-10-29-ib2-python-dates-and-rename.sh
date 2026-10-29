#!/usr/bin/env bash
# Применяет на СЕРВЕРЕ две правки данных БЕЗ перезапуска службы mdtask:
#   1) переименование 2 студентов (Абдумаликов Оятилло, Мажидов Музаффар);
#   2) перенос срока ВСЕХ просроченных заданий Python группы ib-2 на 2026-11-12.
#
# Перезапуск не нужен: сервер читает имена и задания из БД на каждый запрос.
# Пишет в ту же SQLite, что и работающий сервер (busy_timeout страхует от блокировки).
# Скрипт идемпотентен: повторный запуск по уже применённому ничего не меняет.
#
# Запуск на сервере:
#   bash 2026-10-29-ib2-python-dates-and-rename.sh            # проект /root/mdtask
#   bash 2026-10-29-ib2-python-dates-and-rename.sh /путь/к/mdtask
set -euo pipefail

PROJECT="${1:-/root/mdtask}"
cd "$PROJECT"
[ -f data/mdtask.db ] || { echo "Нет data/mdtask.db в $PROJECT" >&2; exit 2; }

STAMP="$(date +%Y-%m-%d-%H%M%S)"
mkdir -p backups
cp data/mdtask.db "backups/mdtask-before-fix-$STAMP.db"
echo "Бэкап БД: backups/mdtask-before-fix-$STAMP.db"

node <<'NODE'
const db = require("better-sqlite3")(require("path").join(process.cwd(), "data", "mdtask.db"));
db.pragma("busy_timeout = 5000");
const NEW_DUE = "2026-11-12";
const now = new Date().toISOString();

db.transaction(() => {
  // 1) Переименование студентов (по старому имени — безопасно и идемпотентно).
  const rn = db.prepare("UPDATE users SET name=? WHERE id=? AND name=?");
  const r1 = rn.run("Абдумаликов Оятилло", "stWeb-357", "Абдумалликов Ойаттулло");
  const r2 = rn.run("Мажидов Музаффар", "stWeb-729", "Мажиддов Музаффар");
  console.log(`Переименование: Абдумаликов ${r1.changes}, Мажидов ${r2.changes}`);

  // 2) Просроченные задания Python группы ib-2 -> NEW_DUE.
  //    Python = archive-upload (subject IS NULL, не pis и не JavaScript/DOM).
  const ib2 = new Set(db.prepare("SELECT id FROM users WHERE student_group=? AND role=?")
    .all("ib-2", "student").map(r => r.id));
  const rows = db.prepare(
    "SELECT id,title,target_type,target_group,target_student_id,subject,md_path,due_date FROM assignments").all();
  const isPython = a => a.subject === null && !a.md_path.startsWith("section-dom-");
  const forIb2 = a => a.target_type === "group"
    ? (a.target_group === "ib-2" || a.target_group === null)
    : ib2.has(a.target_student_id);
  const target = rows.filter(a => isPython(a) && forIb2(a) && a.due_date < now);
  const upd = db.prepare("UPDATE assignments SET due_date=? WHERE id=?");
  for (const a of target) upd.run(NEW_DUE, a.id);
  console.log(`Сроки перенесены на ${NEW_DUE}: заданий ${target.length}`);
  target.forEach(a => console.log(`  - ${a.title}`));
})();

console.log("Готово. Перезапуск сервера не требуется.");
NODE
