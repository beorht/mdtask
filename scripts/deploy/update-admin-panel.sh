#!/usr/bin/env bash
# Обновление прод-сервера: ТОЛЬКО новая админ-панель (код) + добавление одного студента в web-1.
#
# Что делает:
#   1) Раскатывает КОД новой версии поверх /root/mdtask (делегирует update-mdtask.sh): бэкап кода,
#      копирует только изменившиеся файлы кода, data/ / uploads/ / backups/ / node_modules/ / .env
#      НЕ ТРОГАЕТ. Отказывается обновлять во время идущей контрольной (--force чтобы всё равно).
#   2) Останавливает службу, добавляет одного студента в группу web-1 (штатный слой БД, пароль
#      std-snrg), снова запускает службу и проверяет /health.
#
# В БД НИЧЕГО НЕ ЧИНИТСЯ: никаких integrity_check / VACUUM / .recover / правок существующих строк.
# Единственная запись в БД — добавление одной учётки (шаг 2), с резервной копией файла БД.
#
# Запуск НА СЕРВЕРЕ из распакованного архива новой версии (SSH извне нет):
#   bash <архив>/scripts/deploy/update-admin-panel.sh [ЦЕЛЬ] [флаги]
#     ЦЕЛЬ            папка проекта (по умолчанию /root/mdtask)
#     --dry-run       показать, что изменится, ничего не делать
#     --force         обновлять даже во время контрольной
#     --id ID         логин нового студента (по умолчанию stWeb-017)
#     --name "Имя"    имя (по умолчанию «Тестов Тест»)
#     --must-change   заставить сменить пароль при первом входе (по умолчанию нет)
#     --skip-user     только код, без добавления пользователя
set -euo pipefail

SERVICE="mdtask"
HEALTH_PORT="${PORT:-42521}"

SELF="$(readlink -f "$0")"; SDIR="$(dirname "$SELF")"
SRC_ROOT="$(readlink -f "$SDIR/../..")"   # корень новой версии рядом со скриптом (должен быть index.js)

TARGET="/root/mdtask"; DRY=0; FORCE=0; MUST=0; SKIP_USER=0
NU_ID="stWeb-017"; NU_NAME="Тестов Тест"
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1 ;;
    --force) FORCE=1 ;;
    --must-change) MUST=1 ;;
    --skip-user) SKIP_USER=1 ;;
    --id) NU_ID="${2:?--id требует значение}"; shift ;;
    --name) NU_NAME="${2:?--name требует значение}"; shift ;;
    --*) echo "Неизвестный флаг: $1" >&2; exit 2 ;;
    *) TARGET="$1" ;;
  esac
  shift
done

[ -f "$SRC_ROOT/index.js" ] || { echo "Рядом со скриптом нет index.js новой версии ($SRC_ROOT)." >&2; exit 2; }
[ -f "$TARGET/index.js" ]   || { echo "В «$TARGET» нет index.js — это не папка проекта mdtask." >&2; exit 2; }

echo "== Шаг 1/3. Деплой кода новой админ-панели (data/ не трогается)"
DEPLOY_FLAGS=(--yes --no-restart)
[ "$FORCE" -eq 1 ] && DEPLOY_FLAGS+=(--force)
[ "$DRY" -eq 1 ] && DEPLOY_FLAGS+=(--dry-run)
bash "$SDIR/update-mdtask.sh" "$SRC_ROOT" "$TARGET" "${DEPLOY_FLAGS[@]}"

if [ "$DRY" -eq 1 ]; then
  if [ "$SKIP_USER" -eq 0 ]; then
    echo "== (--dry-run) Был бы добавлен студент: $NU_ID / $NU_NAME / web-1 / пароль std-snrg. БД не трогается."
  fi
  exit 0
fi

if [ "$SKIP_USER" -eq 0 ]; then
  echo "== Шаг 2/3. Остановка службы и добавление студента в web-1 (БД не чинится)"
  systemctl stop "$SERVICE" || true
  sleep 1
  set +e
  ( cd "$TARGET" && MUST_CHANGE="$MUST" NU_NAME="$NU_NAME" bash scripts/fixes/add-web-1-user.sh "$NU_ID" )
  ADD_RC=$?
  set -e
  if [ "$ADD_RC" -eq 0 ]; then echo "   студент добавлен"
  elif [ "$ADD_RC" -eq 4 ]; then echo "   студент с таким логином уже был — пропущено"
  else echo "!! add-web-1-user.sh завершился с кодом $ADD_RC (служба всё равно будет запущена)"; fi
else
  echo "== Шаг 2/3. Пропущено (--skip-user): только код"
  systemctl stop "$SERVICE" || true
  sleep 1
fi

echo "== Шаг 3/3. Запуск службы $SERVICE"
systemctl start "$SERVICE"
sleep 2
systemctl is-active --quiet "$SERVICE" && echo "   служба active" || echo "!! служба не запустилась: journalctl -u $SERVICE -n 50" >&2
if curl -fsS "http://localhost:$HEALTH_PORT/health" >/dev/null 2>&1; then
  echo "   /health OK (порт $HEALTH_PORT)"
else
  echo "   /health не ответил на порту $HEALTH_PORT (проверьте порт: systemctl cat $SERVICE)"
fi
echo "== Готово. Откат кода: cd $TARGET && tar xzf backups/code-before-update-<последняя-дата>.tar.gz"
