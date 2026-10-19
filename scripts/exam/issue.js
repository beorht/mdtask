#!/usr/bin/env node
// Итоговая контрольная: выдать варианты и песочницы терминала (то же, что кнопка в админке).
//   node scripts/exam/issue.js                         — всем студентам группы без варианта
//   node scripts/exam/issue.js --student st-test-001 --index 4   — вариант №4 одному (TEST или до начала)
//   node scripts/exam/issue.js --sandbox st-ib-125     — пересоздать песочницу из того же варианта
// Опции: --exam ib-final-1 (по умолчанию). База — DB_PATH (по умолчанию data/mdtask.db),
// каталог контрольной — EXAM_DIR (data/exam). Перед выдачей настоящей группе — резервная копия базы.
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args[i + 1];
};

const exam = require('../../src/lib/exam');
const examAdmin = require('../../src/lib/exam/admin');

const def = exam.getExamDef(opt('exam') || 'ib-final-1');
if (!def) {
  console.error('Нет такой контрольной');
  process.exit(1);
}

try {
  if (opt('sandbox')) {
    examAdmin.rebuildSandbox(def, opt('sandbox'));
    console.log(`Песочница ${opt('sandbox')} пересоздана`);
  } else if (opt('student')) {
    const index = Math.max(1, Math.min(18, parseInt(opt('index') || '1', 10))) - 1;
    const v = examAdmin.reissue(def, opt('student'), index);
    console.log(`${v.studentId}: вариант №${v.index + 1}, тема ${v.theme}`);
  } else {
    const { issued, total } = examAdmin.issueForGroup(def);
    console.log(`Выдано: ${issued.length} из ${total}${issued.length ? ' — ' + issued.join(', ') : ''}`);
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
