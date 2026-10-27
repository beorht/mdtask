#!/usr/bin/env bash
# Обновление рабочего сервера mdtask из архива проекта (собран без node_modules).
#
#   bash update-server.sh АРХИВ.tar.gz [ПАПКА_ПРОЕКТА, по умолчанию /home/tech/Projects/mdtask/mdtask] [--dry-run] [--yes] [--no-restart] [--with-content] [--force]
#
# Что делает:
#   1. Распаковывает архив во временную папку и показывает, какие файлы кода изменятся.
#   2. Делает копию базы (backups/mdtask-before-update-<время>.db) и копию заменяемых файлов кода
#      (backups/code-before-update-<время>.tar.gz).
#   3. Копирует код: src, public, ib, scripts, tests, docs, index.js, package*.json, CLAUDE.md, README.md, TODO.md.
#      Данные сервера НЕ трогает: data/, uploads/, backups/, results_exam/, archive/, node_modules/, .env.
#      content/ (задания, которые преподаватель правит в админке) копируется только с --with-content;
#      content/html, content/css и content/python-course (материалы предметов) копируются всегда.
#      Ничего не удаляет — только добавляет и заменяет файлы.
#   4. Если изменился package.json — останавливается и просит поставить пакеты (npm ci без интернета не запускать).
#   5. Перезапускает запущенные из этой папки процессы `node index.js` с теми же переменными окружения
#      и проверяет /health.
#   Во время идущей контрольной (окно + 2 минуты) скрипт ничего не копирует и выходит: новые шаблоны и public/
#   начали бы работать сразу, а код сервера — только после перезапуска. --force — обновить и перезапустить всё равно.
#   --dry-run показывает изменения и во время контрольной. --no-restart — для серверов под systemd/pm2.
set -euo pipefail

ARCHIVE=""
PROJECT=""
DRY=0
YES=0
RESTART=1
WITH_CONTENT=0
FORCE=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    --yes|-y) YES=1 ;;
    --no-restart) RESTART=0 ;;
    --with-content) WITH_CONTENT=1 ;;
    --force) FORCE=1 ;;
    -h|--help) sed -n 2,20p "$0"; exit 0 ;;
    -*) echo "Неизвестный ключ: $a" >&2; exit 2 ;;
    *) if [ -z "$ARCHIVE" ]; then ARCHIVE="$a"; elif [ -z "$PROJECT" ]; then PROJECT="$a"; else echo "Лишний аргумент: $a" >&2; exit 2; fi ;;
  esac
done
[ -n "$ARCHIVE" ] || { echo "Укажите архив: bash $0 mdtask-....tar.gz [папка проекта]" >&2; exit 2; }
[ -f "$ARCHIVE" ] || { echo "Нет файла $ARCHIVE" >&2; exit 2; }
ARCHIVE="$(cd "$(dirname "$ARCHIVE")" && pwd)/$(basename "$ARCHIVE")"
PROJECT="${PROJECT:-/home/tech/Projects/mdtask/mdtask}"
PROJECT="$(cd "$PROJECT" && pwd)"
[ -f "$PROJECT/index.js" ] && [ -d "$PROJECT/node_modules" ] || { echo "$PROJECT — не папка mdtask (нет index.js или node_modules)" >&2; exit 2; }

# content/html, content/css и content/python-course — материалы предметов из репозитория (в админке не правятся), копируются всегда.
CODE=(src public ib scripts tests docs index.js package.json package-lock.json CLAUDE.md README.md TODO.md .gitignore content/html content/css content/python-course)
[ "$WITH_CONTENT" = 1 ] && CODE+=(content)

STAMP="$(date +%Y-%m-%d-%H-%M-%S)"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/mdtask-update.XXXXXX")"
trap 'rm -rf "${TMP:?}"' EXIT

echo "== Распаковка $ARCHIVE"
TOP="$({ tar tzf "$ARCHIVE" 2>/dev/null || true; } | head -1 | cut -d/ -f1)"
tar xzf "$ARCHIVE" -C "$TMP" --exclude="$TOP/data" --exclude="$TOP/uploads" --exclude="$TOP/backups" \
  --exclude="$TOP/results_exam" --exclude="$TOP/archive" --exclude="$TOP/node_modules" --exclude="$TOP/.git"
NEW="$TMP/$TOP"
[ -f "$NEW/package.json" ] && [ -d "$NEW/src" ] || { echo "В архиве не найден проект mdtask" >&2; exit 1; }

echo "== Что изменится в $PROJECT"
CHANGED="$TMP/changed.txt"
: > "$CHANGED"
for p in "${CODE[@]}"; do
  [ -e "$NEW/$p" ] || continue
  if [ -d "$NEW/$p" ]; then
    (cd "$NEW" && find "$p" -type f ! -path '*/__pycache__/*') | while read -r f; do
      cmp -s "$NEW/$f" "$PROJECT/$f" 2>/dev/null || echo "$f" >> "$CHANGED"
    done
  else
    cmp -s "$NEW/$p" "$PROJECT/$p" 2>/dev/null || echo "$p" >> "$CHANGED"
  fi
done
N=$(wc -l < "$CHANGED")
if [ "$N" = 0 ]; then echo "Код на сервере уже совпадает с архивом — менять нечего."; exit 0; fi
while read -r f; do
  if [ -e "$PROJECT/$f" ]; then echo "  изменён  $f"; else echo "  новый    $f"; fi
done < "$CHANGED"
echo "Всего файлов: $N"
if [ "$WITH_CONTENT" = 0 ] && [ -d "$NEW/content" ] && ! diff -rq "$NEW/content" "$PROJECT/content" >/dev/null 2>&1; then
  echo "  (папка content/ отличается, но не копируется: там задания из админки сервера; нужно — добавьте --with-content)"
fi

PKG_CHANGED=0
cmp -s "$NEW/package.json" "$PROJECT/package.json" || PKG_CHANGED=1
cmp -s "$NEW/package-lock.json" "$PROJECT/package-lock.json" || PKG_CHANGED=1

# Идёт ли сейчас контрольная (окно + 2 минуты на досылку)?
EXAM_NOW="$(cd "$PROJECT" && DBP="${DB_PATH:-$PROJECT/data/mdtask.db}" node -e '
  const Database = require("better-sqlite3");
  const db = new Database(process.env.DBP, { readonly: true, fileMustExist: true });
  let rows = [];
  try { rows = db.prepare("SELECT id, starts_at, ends_at FROM exams").all(); } catch (e) {}
  const now = Date.now();
  console.log(rows.filter((r) => Date.parse(r.starts_at) <= now && now <= Date.parse(r.ends_at) + 120000).map((r) => r.id + " до " + new Date(Date.parse(r.ends_at)).toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })).join(", "));
' 2>/dev/null || true)"
if [ -n "$EXAM_NOW" ]; then
  echo "!! Сейчас идёт контрольная: $EXAM_NOW (+2 минуты на досылку)."
  if [ "$DRY" = 1 ]; then
    echo "   Без --force обновление будет отменено."
  elif [ "$FORCE" = 0 ]; then
    echo "   Обновление отменено: ничего не скопировано. Запустите скрипт после окончания контрольной" >&2
    echo "   (или с --force: обновить и перезапустить сейчас — студентам, возможно, придётся войти заново)." >&2
    exit 1
  else
    echo "   --force: обновляю и перезапускаю во время контрольной."
  fi
fi

if [ "$DRY" = 1 ]; then echo "== --dry-run: ничего не изменено"; exit 0; fi
if [ "$PKG_CHANGED" = 1 ]; then
  echo "!! Изменились package.json / package-lock.json — нужны новые пакеты. Обновление остановлено." >&2
  echo "   Поставьте пакеты (npm ci при доступе к интернету) и запустите скрипт снова." >&2
  exit 1
fi

if [ "$YES" = 0 ]; then
  read -r -p "Обновить код ($N файлов)? [y/N] " ans
  case "$ans" in y|Y|д|Д|yes|да) ;; *) echo "Отменено."; exit 1 ;; esac
fi

mkdir -p "$PROJECT/backups"
DB_FILE="${DB_PATH:-$PROJECT/data/mdtask.db}"
if [ -f "$DB_FILE" ]; then
  echo "== Копия базы → backups/mdtask-before-update-$STAMP.db"
  (cd "$PROJECT" && SRC="$DB_FILE" DST="$PROJECT/backups/mdtask-before-update-$STAMP.db" node -e '
    const Database = require("better-sqlite3");
    new Database(process.env.SRC, { fileMustExist: true }).backup(process.env.DST)
      .then(() => console.log("   готово")).catch((e) => { console.error(e.message); process.exit(1); });
  ')
fi

echo "== Копия заменяемых файлов кода → backups/code-before-update-$STAMP.tar.gz"
OLD_LIST="$TMP/old.txt"
while read -r f; do [ -e "$PROJECT/$f" ] && echo "$f"; done < "$CHANGED" > "$OLD_LIST" || true
if [ -s "$OLD_LIST" ]; then
  (cd "$PROJECT" && tar czf "backups/code-before-update-$STAMP.tar.gz" -T "$OLD_LIST")
else
  echo "   (заменяемых файлов нет, только новые)"
fi
cp "$CHANGED" "$PROJECT/backups/code-update-$STAMP-files.txt"

echo "== Копирование кода"
(cd "$NEW" && tar cf - -T "$CHANGED") | (cd "$PROJECT" && tar xf - --no-same-owner)
echo "   скопировано файлов: $N (список: backups/code-update-$STAMP-files.txt)"

echo "== Проверка, что приложение загружается"
(cd "$PROJECT" && DB_PATH=:memory: node -e 'require("./src/server").createApp(); console.log("   ok")') || {
  echo "!! Приложение не загрузилось. Вернуть старый код:" >&2
  echo "   cd $PROJECT && tar xzf backups/code-before-update-$STAMP.tar.gz" >&2
  exit 1
}

if [ "$RESTART" = 0 ]; then
  echo "== Без перезапуска. Новый код заработает после перезапуска сервера."
  exit 0
fi

echo "== Перезапуск"
PIDS=""
for pid in $(pgrep -u "$(id -u)" -f 'index\.js' || true); do
  [ "$pid" = "$$" ] && continue
  [ "$(readlink "/proc/$pid/cwd" 2>/dev/null)" = "$PROJECT" ] || continue
  case "$(basename "$(readlink "/proc/$pid/exe" 2>/dev/null)")" in node*) ;; *) continue ;; esac
  PIDS="$PIDS $pid"
done
if [ -z "$PIDS" ]; then
  echo "   Запущенных процессов mdtask из $PROJECT не найдено — запустите сервер как обычно."
  exit 0
fi
PORTS=""
for pid in $PIDS; do
  cp "/proc/$pid/environ" "$TMP/env.$pid"
  cp "/proc/$pid/cmdline" "$TMP/cmd.$pid"
  port="$(tr '\0' '\n' < "/proc/$pid/environ" | sed -n 's/^PORT=//p')"
  PORTS="$PORTS ${port:-42521}"
  echo "   останавливаю $pid (порт ${port:-42521})"
  kill "$pid"
done
for i in $(seq 1 50); do
  alive=0
  for pid in $PIDS; do kill -0 "$pid" 2>/dev/null && alive=1; done
  [ "$alive" = 0 ] && break
  sleep 0.2
done
for pid in $PIDS; do
  mapfile -d '' -t CMD < "$TMP/cmd.$pid"
  mapfile -d '' -t ENVV < "$TMP/env.$pid"
  port="$(tr '\0' '\n' < "$TMP/env.$pid" | sed -n 's/^PORT=//p' | head -1)"
  LOG="/tmp/mdtask-server-${port:-42521}.log"
  (cd "$PROJECT" && exec setsid -f env -i "${ENVV[@]}" nohup "${CMD[@]}" >> "$LOG" 2>&1 < /dev/null)
  echo "   запущен: ${CMD[*]}  (журнал $LOG)"
done
sleep 2
for port in $PORTS; do
  for i in $(seq 1 15); do
    if curl -fsS "http://localhost:$port/health" >/dev/null 2>&1; then echo "   порт $port: ok"; continue 2; fi
    sleep 1
  done
  echo "!! порт $port не отвечает на /health — смотрите журнал в /tmp/mdtask-server-*.log" >&2
done
echo "== Готово. Откат кода: cd $PROJECT && tar xzf backups/code-before-update-$STAMP.tar.gz (новые файлы останутся, они не мешают)."
