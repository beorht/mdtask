// Блок C ИБ-контрольной: «Поиск и исправление ошибок». Студенту дана готовая программа 50–60 строк
// с одной тонкой ошибкой (разные виды, с упором на работу с данными). Он правит код и запускает —
// не больше 4 раз; вердикт (сколько тестов прошло) НЕ показывается; после 4-го запуска код
// автоматически отправляется на проверку (блокируется). Прогресс/счётчик запусков — ib_mid_progress.
// Программы и тесты — content/ib-mid/block-c/<id>.{py,json}.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', '..', '..', 'content', 'ib-mid', 'block-c');
const IDS = ['c1', 'c2', 'c3'];
const RUNS_LIMIT = 4;
const cache = new Map();

function load(id) {
  if (!cache.has(id)) {
    const meta = JSON.parse(fs.readFileSync(path.join(DIR, `${id}.json`), 'utf-8'));
    const code = fs.readFileSync(path.join(DIR, `${id}.py`), 'utf-8');
    cache.set(id, { ...meta, code });
  }
  return cache.get(id);
}

function isBlockCTask(id) {
  return IDS.includes(id);
}

// Данные для страницы: условие, исходный (багованный) код, входы тестов (БЕЗ эталонных выводов).
function view(id) {
  const t = load(id);
  return {
    id,
    title: t.title,
    description: t.description,
    starter: t.code,
    tests: t.tests.map((x) => ({ input: x.input })),
    runsLimit: RUNS_LIMIT,
  };
}

function norm(x) {
  return String(x == null ? '' : x).replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n+$/, '');
}

// Скрытая проверка выводов студента против эталонов. -> { pass, total, solved }
function grade(id, outputs) {
  const t = load(id);
  const outs = Array.isArray(outputs) ? outputs : [];
  const pass = t.tests.reduce((n, test, i) => n + (norm(outs[i]) === norm(test.output) ? 1 : 0), 0);
  return { pass, total: t.tests.length, solved: pass === t.tests.length };
}

module.exports = { IDS, RUNS_LIMIT, isBlockCTask, view, grade, load };
