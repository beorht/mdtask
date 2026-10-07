#!/usr/bin/env bash
# Чекер для №2. Контейнерная изоляция
# Проверяет docker inspect контейнера студента на предмет лимитов и снижения привилегий.
#
# Использование:
#   ./task2_check.sh <student_id> <container_name>
#
# Печатает JSON-отчёт по этапам в stdout.
# Запускается на хосте, где выполняется docker (или через ssh на docker-хост).

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"

STUDENT="$1"
CONTAINER="$2"

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  add_stage 1 "Контейнер существует и запущен" "fail" "docker inspect не нашёл контейнер ${CONTAINER}"
  print_report "task2" "$STUDENT"
  exit 0
fi
add_stage 1 "Контейнер существует и запущен" "pass" "найден"

INSPECT="$(docker inspect "$CONTAINER")"
jq_get() { echo "$INSPECT" | jq -r "$1"; }

# Этап 2: лимит памяти
MEM=$(jq_get '.[0].HostConfig.Memory')
if [[ "$MEM" != "0" && -n "$MEM" ]]; then
  add_stage 2 "Лимит памяти задан (--memory)" "pass" "Memory=${MEM} байт"
else
  add_stage 2 "Лимит памяти задан (--memory)" "fail" "Memory не ограничен (0)"
fi

# Этап 3: лимит CPU
CPUS=$(jq_get '.[0].HostConfig.NanoCpus')
if [[ "$CPUS" != "0" && -n "$CPUS" ]]; then
  add_stage 3 "Лимит CPU задан (--cpus)" "pass" "NanoCpus=${CPUS}"
else
  add_stage 3 "Лимит CPU задан (--cpus)" "fail" "CPU не ограничен"
fi

# Этап 4: лимит числа процессов (защита от fork-бомб)
PIDS=$(jq_get '.[0].HostConfig.PidsLimit')
if [[ "$PIDS" != "0" && "$PIDS" != "null" && -n "$PIDS" ]]; then
  add_stage 4 "Лимит процессов задан (--pids-limit)" "pass" "PidsLimit=${PIDS}"
else
  add_stage 4 "Лимит процессов задан (--pids-limit)" "fail" "PidsLimit не задан"
fi

# Этап 5: сброшены привилегии (CapDrop содержит ALL)
CAPDROP=$(jq_get '.[0].HostConfig.CapDrop[]?' | tr '\n' ',')
if [[ "$CAPDROP" == *"ALL"* ]]; then
  add_stage 5 "Привилегии сброшены (--cap-drop=ALL)" "pass" "CapDrop=${CAPDROP}"
else
  add_stage 5 "Привилегии сброшены (--cap-drop=ALL)" "fail" "CapDrop=${CAPDROP:-пусто}"
fi

# Этап 6: no-new-privileges
SECOPT=$(jq_get '.[0].HostConfig.SecurityOpt[]?' | tr '\n' ',')
if [[ "$SECOPT" == *"no-new-privileges"* ]]; then
  add_stage 6 "no-new-privileges включен" "pass" "SecurityOpt=${SECOPT}"
else
  add_stage 6 "no-new-privileges включен" "fail" "SecurityOpt=${SECOPT:-пусто}"
fi

# Этап 7: файловая система только для чтения
READONLY=$(jq_get '.[0].HostConfig.ReadonlyRootfs')
if [[ "$READONLY" == "true" ]]; then
  add_stage 7 "Rootfs смонтирован read-only" "pass" "ReadonlyRootfs=true"
else
  add_stage 7 "Rootfs смонтирован read-only" "fail" "ReadonlyRootfs=${READONLY}"
fi

# Этап 8: контейнер не в дефолтном bridge с полным доступом в интернет
NETMODE=$(jq_get '.[0].HostConfig.NetworkMode')
if [[ "$NETMODE" != "default" && "$NETMODE" != "bridge" ]]; then
  add_stage 8 "Используется изолированная сеть (не дефолтный bridge)" "pass" "NetworkMode=${NETMODE}"
else
  add_stage 8 "Используется изолированная сеть (не дефолтный bridge)" "fail" "NetworkMode=${NETMODE}"
fi

print_report "task2" "$STUDENT"
