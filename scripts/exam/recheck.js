#!/usr/bin/env node
// Итоговая контрольная: перепроверка кода, сданного в заданиях 3.1–3.7, на этом компьютере.
// Во время контрольной программы выполняются в браузере студента, и сервер видит только их вывод.
// Этот скрипт запускает сохранённый код каждого студента (python3, 10 секунд на тест) на тех же
// тестах и сравнивает итог с записанным. Он нужен, чтобы:
//   - получить результат для программ, отправленных по окончании времени без прогона тестов;
//   - найти расхождения: сервер записал «решено», а код тесты не проходит (подмена вывода).
// Код студентов выполняется на этом компьютере — запускайте скрипт осознанно.
//
//   node scripts/exam/recheck.js                    — отчёт по всем, база не меняется
//   node scripts/exam/recheck.js --student st-ib-125
//   node scripts/exam/recheck.js --update-db        — записать результат там, где его нет
//   node scripts/exam/recheck.js --update-db --all  — переписать результаты по перепроверке везде
// База — DB_PATH (data/mdtask.db). Перед --update-db сделайте резервную копию базы.
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const args = process.argv.slice(2);
const has = (name) => args.includes(`--${name}`);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args[i + 1];
};

const db = require('../../src/db');
const exam = require('../../src/lib/exam');
const { normalize } = require('../../src/lib/python-basics-check');

const def = exam.getExamDef(opt('exam') || 'ib-final-1');
const PYTHON = process.env.IB_PYTHON || 'python3';
const TIMEOUT_MS = 10000;

function runTests(code, tests) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exam-recheck-'));
  try {
    return tests.map((t) => {
      const r = spawnSync(PYTHON, ['-I', '-c', code], { input: t.input.join('\n') + '\n', cwd: dir, encoding: 'utf-8', timeout: TIMEOUT_MS });
      const error = r.error && r.error.code === 'ETIMEDOUT' ? 'превышено время' : r.status !== 0 ? (String(r.stderr).trim().split('\n').pop() || 'ошибка') : null;
      return { passed: !error && normalize(r.stdout) === normalize(t.output), error };
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const variants = db.getExamVariants(def.id).filter((v) => !opt('student') || v.studentId === opt('student'));
let checked = 0;
let mismatches = 0;
let written = 0;
for (const variant of variants) {
  const tasks = exam.tasksOf(variant).filter((t) => t.kind === 'bug' || t.kind === 'algorithm');
  const rows = new Map(db.getExamTasks(def.id, variant.studentId).map((r) => [r.taskId, r]));
  for (const task of tasks) {
    const row = rows.get(task.id);
    const code = row && (row.answer || (task.kind === 'bug' && row.submittedAt ? row.draft : null));
    if (!code) continue;
    if (task.kind === 'bug' && !row.submittedAt) continue;
    checked += 1;
    const tests = runTests(code, task.tests);
    const passed = tests.filter((t) => t.passed).length;
    const solved = passed === tests.length;
    const stored = row.result ? `${row.result.passed}/${row.result.total}` : 'нет';
    const differs = row.result ? row.solved !== solved : true;
    if (row.result && differs) mismatches += 1;
    const mark = !row.result ? 'НЕТ ПРОГОНА' : differs ? 'РАСХОЖДЕНИЕ' : 'ok';
    console.log(`${mark.padEnd(12)} ${variant.studentId.padEnd(12)} ${task.id} ${task.kind.padEnd(9)} записано ${stored.padEnd(5)} перепроверка ${passed}/${tests.length}`);
    if (has('update-db') && (!row.result || has('all'))) {
      // Algorithms: the forbidden-function verdict of the original check stays.
      const forbidden = row.result && row.result.forbidden && row.result.forbidden.length;
      db.setExamTaskResult(def.id, variant.studentId, task.id, { passed, total: tests.length, tests, recheck: true, forbidden: row.result ? row.result.forbidden : undefined }, solved && !forbidden);
      written += 1;
    }
  }
}
console.log(`\nПроверено: ${checked}, расхождений: ${mismatches}${has('update-db') ? `, записано: ${written}` : ''}.`);
