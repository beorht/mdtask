#!/usr/bin/env bash
# Локальное обновление прод-сервера mdtask из распакованного архива новой версии.
#
# Запускается НА СЕРВЕРЕ (SSH-доступа извне нет): пользователь заливает архив новой версии, распаковывает
# его и запускает этот скрипт. Служба — systemd `mdtask`, проект — /root/mdtask.
# Заменяется только КОД; данные сервера не трогаются: data/, uploads/, backups/, results_exam/,
# archive/, node_modules/, .env, data/session-secret.
#
# Использование:
#   bash update-mdtask.sh ИСТОЧНИК [ЦЕЛЬ] [--dry-run] [--yes] [--no-restart] [--force]
#     ИСТОЧНИК      распакованная папка новой версии (в ней index.js) ИЛИ архив .tar.gz (верхняя папка mdtask)
#     ЦЕЛЬ          папка проекта на сервере, по умолчанию /root/mdtask
#     --dry-run     показать, что изменится, и ничего не менять
#     --yes         не спрашивать подтверждение
#     --no-restart  не перезапускать службу mdtask
#     --force       обновлять даже во время идущей контрольной
#
# Откат: cd ЦЕЛЬ && tar xzf backups/code-before-update-<дата>.tar.gz (новые файлы останутся — не мешают).
set -euo pipefail

SERVICE="mdtask"
HEALTH_PORT="${PORT:-42521}"
EXCLUDES=(data uploads backups results_exam archive node_modules .git)

SRC=""; TARGET="/root/mdtask"; DRY=0; YES=0; RESTART=1; FORCE=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    --yes) YES=1 ;;
    --no-restart) RESTART=0 ;;
    --force) FORCE=1 ;;
    --*) echo "Неизвестный флаг: $a" >&2; exit 2 ;;
    *) if [ -z "$SRC" ]; then SRC="$a"; else TARGET="$a"; fi ;;
  esac
done
[ -n "$SRC" ] || { echo "Укажите источник: bash $0 ПАПКА_ИЛИ_АРХИВ [ЦЕЛЬ]" >&2; exit 2; }
[ -f "$TARGET/index.js" ] || { echo "В «$TARGET» нет index.js — это не папка проекта mdtask." >&2; exit 2; }

TMP=""
cleanup() { [ -n "$TMP" ] && rm -rf "$TMP"; return 0; }
trap cleanup EXIT

# --- источник -> папка новой версии NEW (с index.js) ---
if [ -f "$SRC" ] && { [[ "$SRC" == *.tar.gz ]] || [[ "$SRC" == *.tgz ]]; }; then
  TMP="$(mktemp -d)"
  tar xzf "$SRC" -C "$TMP"
  NEW="$(dirname "$(find "$TMP" -maxdepth 3 -name index.js -type f | head -1)")"
elif [ -d "$SRC" ]; then
  if [ -f "$SRC/index.js" ]; then NEW="$SRC";
  elif [ -f "$SRC/mdtask/index.js" ]; then NEW="$SRC/mdtask";
  else NEW="$(dirname "$(find "$SRC" -maxdepth 3 -name index.js -type f | head -1)")"; fi
else
  echo "Источник «$SRC» — не папка и не .tar.gz" >&2; exit 2
fi
[ -n "${NEW:-}" ] && [ -f "$NEW/index.js" ] || { echo "Не нашёл index.js в источнике." >&2; exit 2; }
echo "Новая версия: $NEW"
echo "Цель:         $TARGET"

# --- не обновлять во время идущей контрольной ---
if [ "$FORCE" -eq 0 ] && command -v node >/dev/null 2>&1 && [ -f "$TARGET/data/mdtask.db" ]; then
  ACTIVE="$(cd "$TARGET" && node -e '
    const path=require("path");
    let db; try { db=require("better-sqlite3")(path.join(process.cwd(),"data","mdtask.db"),{readonly:true}); }
    catch(e){ process.exit(0); }
    let rows=[]; try { rows=db.prepare("SELECT id,starts_at,ends_at FROM exams").all(); } catch(e){}
    const now=Date.now();
    console.log(rows.filter(r=>Date.parse(r.starts_at)<=now && now<=Date.parse(r.ends_at)+120000).map(r=>r.id).join(", "));
  ' 2>/dev/null || true)"
  if [ -n "$ACTIVE" ]; then
    echo "!! Идёт контрольная: $ACTIVE. Обновление отменено (--force чтобы всё равно обновить, --dry-run чтобы посмотреть)." >&2
    exit 3
  fi
fi

# --- список файлов кода новой версии ---
PRUNE=(); for d in "${EXCLUDES[@]}"; do PRUNE+=(-path "./$d" -o); done
NEW_LIST="$(cd "$NEW" && find . \( "${PRUNE[@]}" -false \) -prune -o -type f ! -name '.env' -print | sed 's|^\./||' | sort)"

# --- изменившиеся и новые файлы ---
CHANGED="$(mktemp)"; : > "$CHANGED"
n_new=0; n_upd=0
while IFS= read -r rel; do
  [ -z "$rel" ] && continue
  if [ ! -e "$TARGET/$rel" ]; then echo "$rel" >> "$CHANGED"; n_new=$((n_new+1));
  elif ! cmp -s "$NEW/$rel" "$TARGET/$rel"; then echo "$rel" >> "$CHANGED"; n_upd=$((n_upd+1)); fi
done <<< "$NEW_LIST"

count=$((n_new+n_upd))
echo "== Изменится файлов: $count (новых $n_new, обновлённых $n_upd)"
if [ "$count" -gt 0 ]; then sed 's/^/   /' "$CHANGED" | head -200; [ "$count" -gt 200 ] && echo "   … ещё $((count-200))"; fi
DEPS=0; grep -qx 'package.json' "$CHANGED" && DEPS=1

if [ "$count" -eq 0 ]; then echo "Нечего обновлять."; rm -f "$CHANGED"; exit 0; fi
if [ "$DRY" -eq 1 ]; then echo "(--dry-run: ничего не изменено)"; rm -f "$CHANGED"; exit 0; fi

if [ "$YES" -eq 0 ]; then
  read -r -p "Применить обновление в $TARGET? [y/N] " ans
  case "$ans" in y|Y|yes|да) ;; *) echo "Отменено."; rm -f "$CHANGED"; exit 0 ;; esac
fi

# --- резервная копия заменяемых файлов ---
STAMP="$(date +%Y-%m-%d-%H%M%S)"
mkdir -p "$TARGET/backups"
OLD_LIST="$(mktemp)"; : > "$OLD_LIST"
while IFS= read -r rel; do [ -e "$TARGET/$rel" ] && echo "$rel" >> "$OLD_LIST"; done < "$CHANGED"
if [ -s "$OLD_LIST" ]; then
  echo "== Резервная копия заменяемых файлов → backups/code-before-update-$STAMP.tar.gz"
  (cd "$TARGET" && tar czf "backups/code-before-update-$STAMP.tar.gz" -T "$OLD_LIST")
fi

# --- копирование новой версии ---
echo "== Копирую новые файлы в $TARGET"
(cd "$NEW" && tar cf - -T "$CHANGED") | (cd "$TARGET" && tar xf - --no-same-owner)
rm -f "$CHANGED" "$OLD_LIST"

if [ "$DEPS" -eq 1 ]; then
  echo "!! Менялся package.json — при необходимости обновите зависимости вручную: cd $TARGET && npm ci --omit=dev"
  echo "   (node_modules в архив не входит; на классных ПК интернета может не быть)"
fi

# --- перезапуск службы ---
if [ "$RESTART" -eq 1 ]; then
  echo "== Перезапуск службы $SERVICE"
  systemctl restart "$SERVICE"
  sleep 2
  systemctl is-active --quiet "$SERVICE" && echo "   служба active" || { echo "!! служба НЕ запустилась: journalctl -u $SERVICE -n 50" >&2; }
  if curl -fsS "http://localhost:$HEALTH_PORT/health" >/dev/null 2>&1; then
    echo "   /health OK (порт $HEALTH_PORT)"
  else
    echo "   /health не ответил на порту $HEALTH_PORT (проверьте порт в unit-файле: systemctl cat $SERVICE)"
  fi
else
  echo "== Служба не перезапущена (--no-restart). Запуск вручную: systemctl restart $SERVICE"
fi

echo "== Готово. Откат: cd $TARGET && tar xzf backups/code-before-update-$STAMP.tar.gz"
