// Проверка всех эталонов курса JavaScript: каждый scripts/js-course/solutions/<id>.js проходит тесты своей задачи
// (content/js-course/**/tasks.json) тем же движком, что у студента, и соблюдает правила задачи. Печатает JSON
// { checked, failed: [...] }; код выхода 1, если что-то не прошло. Запускается тестами (tests/routes/js-course.test.js).
const fs = require('fs');
const path = require('path');
const { run } = require('../../public/js/js-runner.js');
const { checkRules } = require('../../src/lib/js-course/rules');
const { normalize } = require('../../src/lib/python-basics-check');
const course = require('../../src/lib/js-course');

const tick = () => new Promise((r) => setImmediate(r));

(async () => {
  const failed = [];
  let checked = 0;
  for (const lesson of course.LESSONS.filter((l) => l.ready)) {
    for (const task of lesson.tasks) {
      const file = path.join(__dirname, 'solutions', `${task.id}.js`);
      if (!fs.existsSync(file)) { failed.push(`${task.id}: нет эталона`); continue; }
      const code = fs.readFileSync(file, 'utf-8');
      checked += 1;
      const rules = checkRules(code, task);
      if (rules.syntax || rules.found.length || rules.missing.length) failed.push(`${task.id}: правила ${JSON.stringify(rules)}`);
      for (const [i, test] of task.tests.entries()) {
        const r = await run(code, test.input, { tick });
        if (r.error || normalize(r.stdout) !== normalize(test.output)) { failed.push(`${task.id}: тест ${i + 1}${r.error ? ` (${r.error})` : ''}`); break; }
      }
    }
  }
  console.log(JSON.stringify({ checked, failed }));
  process.exit(failed.length ? 1 : 0);
})();
