// Перепроверка собранного содержимого курса «Bash: скрипты в Linux»: каждый эталон (scripts/bash-course/solutions/<id>.sh)
// обязан пройти все тесты своей задачи (content/bash/<тема>/tasks.json) и соблюдать правила; каждый вопрос типа «output»
// (tests.json) — его вариант-ответ обязан совпасть с выводом движка. Печатает JSON { checked, checkedQuiz, failed: [] }.
// Запускается тестами (tests/routes/bash-course.test.js). Код возврата 0, если всё сошлось.
const fs = require('fs');
const path = require('path');
const { checkTask, runOne, normalize } = require('../../src/lib/bash-course/validate');
const { checkRules } = require('../../src/lib/bash-course/rules');

const ROOT = path.join(__dirname, '..', '..');
const DIR = path.join(ROOT, 'content', 'bash');
const SOL = path.join(__dirname, 'solutions');

const topics = JSON.parse(fs.readFileSync(path.join(DIR, 'topics.json'), 'utf-8'));
const failed = [];
let checked = 0;
let checkedQuiz = 0;

for (const topic of topics) {
  const tasksPath = path.join(DIR, topic.dir, 'tasks.json');
  if (!fs.existsSync(tasksPath)) continue;
  const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
  for (const task of tasks) {
    checked += 1;
    const solPath = path.join(SOL, `${task.id}.sh`);
    if (!fs.existsSync(solPath)) { failed.push({ id: task.id, why: 'нет файла эталона' }); continue; }
    const code = fs.readFileSync(solPath, 'utf-8');
    const rules = checkRules(code, task);
    if (rules.syntax) { failed.push({ id: task.id, why: 'синтаксис: ' + rules.syntax }); continue; }
    if (rules.found.length || rules.missing.length) { failed.push({ id: task.id, why: 'правила: ' + JSON.stringify(rules) }); continue; }
    const res = checkTask(task, code);
    if (!res.solved) failed.push({ id: task.id, why: `эталон прошёл ${res.passed}/${res.total} тестов` });
  }
  const testsPath = path.join(DIR, topic.dir, 'tests.json');
  if (fs.existsSync(testsPath)) {
    const quiz = JSON.parse(fs.readFileSync(testsPath, 'utf-8'));
    for (const q of quiz) {
      checkedQuiz += 1;
      if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.options.length) { failed.push({ id: q.id, why: 'неверный answer' }); continue; }
      if (q.kind === 'output') {
        const r = runOne(q.code, q.run || {});
        if (r.error) { failed.push({ id: q.id, why: 'код вопроса упал: ' + r.error }); continue; }
        if (normalize(q.options[q.answer]) !== normalize(r.stdout)) failed.push({ id: q.id, why: 'ответ не совпал с выводом движка' });
      }
    }
  }
}

process.stdout.write(JSON.stringify({ checked, checkedQuiz, failed }));
process.exit(failed.length ? 1 : 0);
