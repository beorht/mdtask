#!/usr/bin/env bash
# Общие функции для чекер-скриптов заданий.
# Каждый чекер накапливает этапы в массиве STAGES_JSON и в конце вызывает print_report.

STAGES_JSON=()

add_stage() {
  local id="$1" title="$2" status="$3" detail="$4"
  detail="${detail//\"/\\\"}"
  STAGES_JSON+=("{\"stage\":${id},\"title\":\"${title}\",\"status\":\"${status}\",\"detail\":\"${detail}\"}")
}

print_report() {
  local task_id="$1" student="$2"
  local total=${#STAGES_JSON[@]}
  local passed=0
  for s in "${STAGES_JSON[@]}"; do
    [[ "$s" == *'"status":"pass"'* ]] && passed=$((passed+1))
  done

  local joined
  joined=$(IFS=,; echo "${STAGES_JSON[*]}")

  echo "{\"task\":\"${task_id}\",\"student\":\"${student}\",\"total_stages\":${total},\"passed_stages\":${passed},\"stages\":[${joined}]}"
}
