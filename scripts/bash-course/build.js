// Сборка тем курса «Bash: скрипты в Linux» из описаний scripts/bash-course/lessons/<имя>.js:
//   module.exports = {
//     dir: '01-intro',
//     theory: `# …Markdown…`,                 // можно опустить — возьмётся из lessons/<имя>.md
//     tasks: [{ id, title, statement, solution: `#!/bin/bash…`, cases: [{ args?, stdin?, files?, wantCode? }],
//              open?: 2, forbid?: [], require?: [] }],
//     quiz:  [{ id, kind: 'output'|'error'|'fix', prompt, code, options: [a,b,c,d], answer: idx, explain }]
//   }
// Эталон каждой задачи выполняется тем же движком, что у студента (public/js/bash-engine.js): его вывод (stdout)
// становится ожидаемым, при wantCode фиксируется и код выхода. Эталон обязан соблюдать правила задачи
// (src/lib/bash-course/rules.js). Вопросы типа «output» сверяются: вариант-ответ обязан совпасть с реальным
// выводом движка. Пишет content/bash/<dir>/{theory.md,tasks.json,tests.json} и scripts/bash-course/solutions/<id>.sh.
//   node scripts/bash-course/build.js <имя темы…> | --all
const fs = require('fs');
const path = require('path');
const { runOne, normalize } = require('../../src/lib/bash-course/validate');
const { checkRules } = require('../../src/lib/bash-course/rules');

const ROOT = path.join(__dirname, '..', '..');
const LESSONS = path.join(__dirname, 'lessons');
const SOL = path.join(__dirname, 'solutions');

function build(name) {
  const base = name.replace(/\.js$/, '');
  const spec = require(path.join(LESSONS, `${base}.js`));
  if (spec.theory === undefined) spec.theory = fs.readFileSync(path.join(LESSONS, `${base}.md`), 'utf-8');
  const out = path.join(ROOT, 'content', 'bash', spec.dir);
  fs.mkdirSync(out, { recursive: true });
  fs.mkdirSync(SOL, { recursive: true });

  // --- практические задачи ---
  const tasks = [];
  let testCount = 0;
  for (const t of (spec.tasks || [])) {
    if (!t.solution) throw new Error(`${t.id}: нет solution`);
    const rules = checkRules(t.solution, t);
    if (rules.syntax) throw new Error(`${t.id}: синтаксическая ошибка в эталоне: ${rules.syntax}`);
    if (rules.found.length || rules.missing.length) throw new Error(`${t.id}: эталон нарушает правила ${JSON.stringify(rules)}`);
    const cases = t.cases && t.cases.length ? t.cases : [{}];
    const builtTests = [];
    for (const c of cases) {
      const r = runOne(t.solution, c);
      if (r.error) throw new Error(`${t.id}: эталон упал на ${JSON.stringify(c)}: ${r.error}\n${r.stderr}`);
      const test = { args: c.args || [], stdin: c.stdin || '', output: r.stdout };
      if (c.files) test.files = c.files;
      if (c.wantCode) test.checkCode = r.code;
      builtTests.push(test);
    }
    testCount += builtTests.length;
    tasks.push({
      id: t.id, title: t.title, statement: t.statement.trim(), openTests: t.open == null ? 2 : t.open,
      ...(t.forbid ? { forbid: t.forbid } : {}), ...(t.require ? { require: t.require } : {}),
      tests: builtTests,
    });
    fs.writeFileSync(path.join(SOL, `${t.id}.sh`), t.solution.trim() + '\n');
  }

  // --- тестовые вопросы (квиз) ---
  const quiz = [];
  for (const q of (spec.quiz || [])) {
    if (!Array.isArray(q.options) || q.options.length < 2) throw new Error(`${q.id}: нужно минимум 2 варианта`);
    if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.options.length) throw new Error(`${q.id}: неверный answer`);
    if (q.kind === 'output') {
      const r = runOne(q.code, q.run || {});
      if (r.error) throw new Error(`${q.id}: код вопроса упал: ${r.error}`);
      if (normalize(q.options[q.answer]) !== normalize(r.stdout)) {
        throw new Error(`${q.id}: вариант-ответ не совпал с выводом движка.\n  ответ:  ${JSON.stringify(q.options[q.answer])}\n  движок: ${JSON.stringify(r.stdout)}`);
      }
    }
    quiz.push({ id: q.id, kind: q.kind, prompt: q.prompt.trim(), ...(q.code ? { code: q.code.replace(/\s+$/, '') } : {}), ...(q.run ? { run: q.run } : {}), options: q.options, answer: q.answer, explain: (q.explain || '').trim() });
  }

  fs.writeFileSync(path.join(out, 'theory.md'), spec.theory.trim() + '\n');
  fs.writeFileSync(path.join(out, 'tasks.json'), JSON.stringify(tasks, null, 1) + '\n');
  fs.writeFileSync(path.join(out, 'tests.json'), JSON.stringify(quiz, null, 1) + '\n');
  console.log(`${spec.dir}: задач ${tasks.length} (тестов ${testCount}), вопросов ${quiz.length}`);
}

const args = process.argv.slice(2);
const names = args[0] === '--all'
  ? fs.readdirSync(LESSONS).filter((f) => f.endsWith('.js')).sort()
  : args;
if (!names.length) { console.error('укажите тему или --all'); process.exit(1); }
try { for (const n of names) build(n); }
catch (e) { console.error(e.message); process.exit(1); }
