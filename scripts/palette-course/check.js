// Чекер решаемости предмета «Цвет и палитра»: для каждой задачи эталонная палитра `sample` (как CSS) должна
// пройти ВСЕ правила (success), а пустой CSS — нет. Гоняется вручную и из тестов.
//   DB_PATH=:memory: node scripts/palette-course/check.js
const course = require('../../src/lib/palette-course');
const { checkPalette } = require('../../src/lib/palette-course/validate');

// sample: { roleKey: '#hex' } → CSS из правил ролей.
function sampleCss(task) {
  const propText = (p) => (p === 'color' ? 'color' : p === 'border' ? 'border-color' : 'background');
  return task.roles
    .filter((r) => task.sample && task.sample[r.key])
    .map((r) => `${r.selector} { ${propText(r.prop)}: ${task.sample[r.key]}; }`)
    .join('\n');
}

function run() {
  let failures = 0;
  let count = 0;
  for (const topic of course.TOPICS) {
    if (!topic.ready) continue;
    for (const task of topic.tasks) {
      count += 1;
      const template = course.loadTemplate(task.template);
      const good = checkPalette(template, task, sampleCss(task));
      if (!good.success) {
        failures += 1;
        const bad = good.checks.filter((c) => !c.ok).map((c) => `${c.label} — ${c.detail}`);
        console.error(`✘ ${topic.key}/${task.id}: эталон НЕ прошёл:\n    ${bad.join('\n    ')}`);
      }
      const empty = checkPalette(template, task, '');
      if (empty.success) {
        failures += 1;
        console.error(`✘ ${topic.key}/${task.id}: пустой CSS засчитан как успех (должен падать).`);
      }
    }
  }
  if (failures) { console.error(`\n${failures} проблем(ы) в ${count} задачах.`); process.exit(1); }
  console.log(`✔ Все ${count} задач: эталон проходит, пустой CSS падает.`);
}

run();
module.exports = { sampleCss };
