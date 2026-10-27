#!/usr/bin/env bash
# Сборка клиента тренажёра «Emmet · Тетрадь» (emmet/, исходник — EmmetEmulator) в public/vendor/emmet/,
# клиента практических работ HTML (emmet/src/html/) в public/vendor/html-course/
# и ожидаемого HTML заданий в src/lib/emmet/data/expected.json. Результат лежит в git: на сервере сборка
# не нужна и npm не запускается. Нужен emmet/node_modules: `npm ci` в emmet/ (с интернетом) или ссылка на
# node_modules проекта EmmetEmulator. После сборки: npm test (тесты сервера) и `cd emmet && npx vitest run` (emmet/tests/*.spec.js — не *.test.js, чтобы их не подхватил node --test).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/emmet"
if [ ! -d node_modules ]; then
  echo "Нет emmet/node_modules: выполните 'npm ci' в emmet/ или ln -s <EmmetEmulator>/node_modules emmet/node_modules" >&2
  exit 1
fi
node scripts/expected.mjs
npx vite build
# Практические работы предмета «Web-разработка: HTML» (emmet/src/html/) — public/vendor/html-course/.
npx vite build --config vite.html.config.js
ls -l "$ROOT/public/vendor/emmet/" "$ROOT/public/vendor/html-course/"
