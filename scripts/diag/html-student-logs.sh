#!/usr/bin/env bash
# Логи студента по предмету «Web-разработка: HTML» из data/mdtask.db через sqlite3 (только чтение,
# безопасно при работающем сервере — WAL допускает параллельных читателей).
#
# Использование (из каталога проекта, например /root/mdtask):
#   bash scripts/diag/html-student-logs.sh ID_СТУДЕНТА [СКОЛЬКО_СОБЫТИЙ]
#   DB=/root/mdtask/data/mdtask.db bash scripts/diag/html-student-logs.sh st-ib-125 50
set -euo pipefail

DB="${DB:-data/mdtask.db}"
SID="${1:?Укажите ID студента: bash scripts/diag/html-student-logs.sh st-... [N]}"
N="${2:-30}"
[ -f "$DB" ] || { echo "Нет файла БД: $DB (запустите из каталога проекта или задайте DB=путь)" >&2; exit 1; }
command -v sqlite3 >/dev/null || { echo "Не найден sqlite3. Установите: apt install sqlite3" >&2; exit 1; }

echo "== Прогресс по заданиям HTML (студент $SID) =="
sqlite3 "$DB" <<SQL
PRAGMA query_only=1;
.mode column
.headers on
.width 24 8 8 11 19
SELECT item_id                                             AS задание,
       CASE WHEN solved_at IS NULL THEN '—' ELSE 'решено' END AS статус,
       json_extract(stats,'\$.attempts')                  AS попыток,
       json_extract(stats,'\$.lastStatus')                AS посл_статус,
       substr(solved_at,1,19)                             AS решено_в
FROM html_progress
WHERE student_id='$SID'
ORDER BY updated_at;
SQL

echo
echo "== Последние $N событий (html_events) =="
sqlite3 "$DB" <<SQL
PRAGMA query_only=1;
.mode column
.headers on
.width 19 10 24 9 8
SELECT substr(created_at,1,19)    AS время,
       type                       AS событие,
       item_id                    AS задание,
       COALESCE(status,'')        AS статус,
       COALESCE(kind,'')          AS вид
FROM html_events
WHERE student_id='$SID'
ORDER BY id DESC
LIMIT $N;
SQL
