#!/usr/bin/env bash
# Чекер для №1. SSH: вход только по ключу
# Проверяет sshd_config и права на authorized_keys на удалённом хосте студента.
#
# Использование:
#   ./task1_check.sh <student_id> <ssh_host> <ssh_user> <identity_file> [ssh_port]
#
# Печатает JSON-отчёт по этапам в stdout.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"

STUDENT="$1"
HOST="$2"
USER_="$3"
IDENTITY="$4"
PORT="${5:-22}"

ssh_run() {
  ssh -i "$IDENTITY" -p "$PORT" \
    -o BatchMode=yes -o ConnectTimeout=6 -o StrictHostKeyChecking=accept-new \
    "${USER_}@${HOST}" "$1" 2>/dev/null
}

# Этап 1: подключение по ключу вообще проходит (без пароля)
if ssh_run "true"; then
  add_stage 1 "Подключение по ключу без пароля" "pass" "ssh с BatchMode=yes отработал"
else
  add_stage 1 "Подключение по ключу без пароля" "fail" "не удалось подключиться в BatchMode (ключ не работает или требуется пароль)"
  print_report "task1" "$STUDENT"
  exit 0
fi

CONFIG="$(ssh_run "sudo cat /etc/ssh/sshd_config 2>/dev/null || cat /etc/ssh/sshd_config")"

check_directive() {
  local id="$1" title="$2" pattern="$3"
  if echo "$CONFIG" | grep -Eiq "$pattern"; then
    add_stage "$id" "$title" "pass" "директива найдена в sshd_config"
  else
    add_stage "$id" "$title" "fail" "директива отсутствует или задана иначе"
  fi
}

# Этап 2-5: ключевые директивы sshd_config
check_directive 2 "PasswordAuthentication no"        '^\s*PasswordAuthentication\s+no'
check_directive 3 "PubkeyAuthentication yes"         '^\s*PubkeyAuthentication\s+yes'
check_directive 4 "PermitRootLogin no"               '^\s*PermitRootLogin\s+no'
check_directive 5 "KbdInteractiveAuthentication no"  '^\s*(KbdInteractiveAuthentication|ChallengeResponseAuthentication)\s+no'

# Этап 6: права на ~/.ssh и authorized_keys
PERMS="$(ssh_run "stat -c '%a' ~/.ssh 2>/dev/null; stat -c '%a' ~/.ssh/authorized_keys 2>/dev/null")"
SSH_DIR_PERM="$(echo "$PERMS" | sed -n '1p')"
KEYS_PERM="$(echo "$PERMS" | sed -n '2p')"

if [[ "$SSH_DIR_PERM" == "700" && "$KEYS_PERM" == "600" ]]; then
  add_stage 6 "Права на ~/.ssh (700) и authorized_keys (600)" "pass" "~/.ssh=${SSH_DIR_PERM}, authorized_keys=${KEYS_PERM}"
else
  add_stage 6 "Права на ~/.ssh (700) и authorized_keys (600)" "fail" "~/.ssh=${SSH_DIR_PERM:-нет}, authorized_keys=${KEYS_PERM:-нет}"
fi

# Этап 7: sshd_config без синтаксических ошибок
if ssh_run "sudo sshd -t" >/dev/null 2>&1; then
  add_stage 7 "sshd -t проходит без ошибок" "pass" "конфиг валиден"
else
  add_stage 7 "sshd -t проходит без ошибок" "fail" "sshd -t вернул ошибку либо нет прав sudo для проверки"
fi

print_report "task1" "$STUDENT"
