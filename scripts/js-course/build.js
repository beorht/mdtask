// Сборка уроков курса «JavaScript: от синтаксиса до DOM» из описаний scripts/js-course/lessons/<имя>.js:
//   module.exports = { dir: 'm1/01-intro', theory: `# …Markdown…`, tasks: [{ id, title, statement, solution, inputs: [[строки]…],
//                      open?: 2, forbid?: [], require?: [] }] }
// theory можно не задавать — тогда она берётся из lessons/<имя>.md; solution — строка или функция
// (() => { … } / async () => { … }): эталоном станет её тело без отступа.
// Эталон каждой задачи выполняется тем же движком, что у студента (public/js/js-runner.js), его вывод становится
// ожидаемым; эталон обязан соблюдать правила задачи (src/lib/js-course/rules.js). Пишет content/js-course/<dir>/theory.md,
// tasks.json и scripts/js-course/solutions/<id>.js.
//   node scripts/js-course/build.js <имя урока…> | --all
const fs = require('fs');
const path = require('path');
const { run } = require('../../public/js/js-runner.js');
const { checkRules } = require('../../src/lib/js-course/rules');

const ROOT = path.join(__dirname, '..', '..');
const LESSONS = path.join(__dirname, 'lessons');
const tick = () => new Promise((r) => setImmediate(r));

function bodyOf(fn) {
  if (typeof fn !== 'function') return String(fn);
  const src = fn.toString();
  const lines = src.slice(src.indexOf('{') + 1, src.lastIndexOf('}')).split('\n');
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return lines.map((l) => l.slice(indent)).join('\n');
}

async function build(name) {
  const base = name.replace(/\.js$/, '');
  const spec = require(path.join(LESSONS, `${base}.js`));
  if (spec.theory === undefined) spec.theory = fs.readFileSync(path.join(LESSONS, `${base}.md`), 'utf-8');
  for (const t of spec.tasks) t.solution = bodyOf(t.solution);
  const out = path.join(ROOT, 'content', 'js-course', spec.dir);
  fs.mkdirSync(out, { recursive: true });
  const tasks = [];
  let tests = 0;
  for (const t of spec.tasks) {
    const rules = checkRules(t.solution, t);
    if (rules.syntax || rules.found.length || rules.missing.length) throw new Error(`${t.id}: эталон нарушает правила ${JSON.stringify(rules)}`);
    const built = [];
    for (const input of t.inputs) {
      const r = await run(t.solution, input, { tick });
      if (r.error) throw new Error(`${t.id}: эталон упал на ${JSON.stringify(input)}: ${r.error}`);
      built.push({ input: input.map(String), output: r.stdout });
    }
    tests += built.length;
    tasks.push({ id: t.id, title: t.title, statement: t.statement.trim(), openTests: t.open ?? 2, ...(t.forbid ? { forbid: t.forbid } : {}), ...(t.require ? { require: t.require } : {}), tests: built });
    fs.writeFileSync(path.join(__dirname, 'solutions', `${t.id}.js`), t.solution.trim() + '\n');
  }
  fs.writeFileSync(path.join(out, 'theory.md'), spec.theory.trim() + '\n');
  fs.writeFileSync(path.join(out, 'tasks.json'), JSON.stringify(tasks, null, 1) + '\n');
  console.log(`${spec.dir}: задач ${tasks.length}, тестов ${tests}`);
}

(async () => {
  const args = process.argv.slice(2);
  const names = args[0] === '--all' ? fs.readdirSync(LESSONS).filter((f) => f.endsWith('.js')).sort() : args;
  for (const n of names) await build(n);
})().catch((e) => { console.error(e.message); process.exit(1); });
