// Предмет «Bash: скрипты в Linux» (src/lib/bash-course): содержание, движок-проверка, правила, доступ, порядок тем,
// проверка решения практики, квиз и серверная перепроверка эталонов.
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const course = require('../../src/lib/bash-course');

const ROOT = path.join(__dirname, '..', '..');
const BASE = course.SUBJECT_BASE;

test.beforeEach(() => {
  db.__resetForTests();
  db.createUser({ id: 'test-1', role: 'student', name: 'Тест Студент', group: 'TEST', mustChangePassword: false });
  db.createUser({ id: 'ib-1', role: 'student', name: 'ИБ Студент', group: 'ib-2', mustChangePassword: false });
  db.createUser({ id: 'w2-1', role: 'student', name: 'Веб Студент', group: 'web-2', mustChangePassword: false });
  db.createUser({ id: 'teach-b', role: 'teacher', name: 'Преподаватель', mustChangePassword: false });
});

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

test('10 тем; у готовой темы — теория с запускаемым примером, 15–18 задач и 10–15 вопросов', () => {
  assert.strictEqual(course.TOPICS.length, 10);
  const ready = course.TOPICS.filter((t) => t.ready);
  assert.ok(ready.length >= 1);
  for (const t of ready) {
    assert.ok(t.tasks.length >= 15 && t.tasks.length <= 18, `${t.key}: задач ${t.tasks.length}`);
    assert.ok(t.quiz.length >= 10 && t.quiz.length <= 15, `${t.key}: вопросов ${t.quiz.length}`);
    assert.match(t.theoryMd, /^# /, t.key);
    assert.match(t.theoryMd, /```bash run/, `${t.key}: в теории есть запускаемый пример`);
    for (const task of t.tasks) {
      assert.ok(task.tests.length >= 1 && task.openTests >= 1, task.id);
      assert.doesNotMatch(task.statement, /```/, `${task.id}: в условии нет блока кода`);
    }
    for (const q of t.quiz) {
      assert.ok(['output', 'error', 'fix'].includes(q.kind), q.id);
      assert.ok(q.options.length >= 2 && typeof q.answer === 'number', q.id);
    }
  }
});

test('нет слов про уровни сложности', () => {
  const texts = course.TOPICS.flatMap((t) => [t.title, t.lead, t.theoryMd, ...t.tasks.flatMap((x) => [x.title, x.statement]), ...t.quiz.flatMap((q) => [q.prompt, q.explain])]).join('\n');
  assert.doesNotMatch(texts, /лёгк(ий|ая|ое) (уров|задач)|средн(ий|яя|его) уровн|сложн(ый|ая) уровн|уровень сложности/i);
});

test('каждый эталон проходит все тесты и соблюдает правила, вопросы «output» совпадают с движком', () => {
  const proc = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'bash-course', 'check.js')], { encoding: 'utf-8' });
  const result = JSON.parse(proc.stdout);
  assert.deepStrictEqual(result.failed, [], proc.stdout);
  assert.strictEqual(result.checked, course.TASK_BY_ID.size);
  assert.strictEqual(proc.status, 0);
});

test('в теории нет строки эталонного решения задач', () => {
  const fs = require('fs');
  for (const t of course.TOPICS.filter((x) => x.ready)) {
    for (const task of t.tasks) {
      const sol = fs.readFileSync(path.join(ROOT, 'scripts', 'bash-course', 'solutions', `${task.id}.sh`), 'utf-8');
      const lines = sol.split('\n').map((s) => s.trim()).filter((s) => s.length >= 24);
      for (const line of lines) assert.ok(!t.theoryMd.includes(line), `${task.id}: «${line}» встречается в теории темы ${t.key}`);
    }
  }
});

test('доступ: TEST и группа ИБ видят предмет, прочие группы — 404', async () => {
  const app = createApp();
  const test1 = await loginAs(app, 'test-1');
  assert.strictEqual((await test1.get(BASE)).status, 200);
  const ib = await loginAs(app, 'ib-1');
  assert.strictEqual((await ib.get(BASE)).status, 200);
  const w2 = await loginAs(app, 'w2-1');
  assert.strictEqual((await w2.get(BASE)).status, 404);
});

test('страницы темы: обзор, теория, практика (редирект на задачу), тест', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'test-1');
  assert.strictEqual((await agent.get(BASE)).status, 200);
  assert.strictEqual((await agent.get(`${BASE}/intro/theory`)).status, 200);
  const practice = await agent.get(`${BASE}/intro/practice`);
  assert.strictEqual(practice.status, 302);
  assert.match(practice.headers.location, /\/subjects\/bash\/intro\/intro-01$/);
  assert.strictEqual((await agent.get(`${BASE}/intro/intro-01`)).status, 200);
  assert.strictEqual((await agent.get(`${BASE}/intro/test`)).status, 200);
});

test('практика закрыта, пока не прочитана теория; после — открыта', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'test-1');
  // TEST имеет полный доступ — практика открыта сразу
  const check = await agent.post(`${BASE}/intro/intro-01/check`).send({ code: 'echo "Привет, мир!"' });
  assert.strictEqual(check.status, 200);
  assert.strictEqual(check.body.solved, true);
});

test('проверка практики: верный скрипт решает, неверный — нет; правила соблюдаются', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'test-1');
  const ok = await agent.post(`${BASE}/intro/intro-09/check`).send({ code: 'echo "OK"\necho "Внимание" >&2' });
  assert.strictEqual(ok.body.solved, true);
  const noRedir = await agent.post(`${BASE}/intro/intro-09/check`).send({ code: 'echo "OK"\necho "Внимание"' });
  assert.strictEqual(noRedir.body.solved, false);
  assert.ok(noRedir.body.missing.length > 0);
});

test('квиз: верный выбор засчитывается, неверный — нет; ответ не раскрывается заранее', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'test-1');
  const q = course.QUIZ_BY_ID.get('intro-q01');
  const wrong = (q.answer + 1) % q.options.length;
  const bad = await agent.post(`${BASE}/intro/quiz/intro-q01/answer`).send({ choice: wrong });
  assert.strictEqual(bad.body.correct, false);
  assert.strictEqual(bad.body.answer, null);
  const good = await agent.post(`${BASE}/intro/quiz/intro-q01/answer`).send({ choice: q.answer });
  assert.strictEqual(good.body.correct, true);
});

test('страница задачи не содержит ссылок на внешние хосты', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'test-1');
  const html = (await agent.get(`${BASE}/intro/intro-01`)).text;
  assert.doesNotMatch(html, /https?:\/\/(?!localhost)/);
});

test('блокировка и дедлайн темы для группы (/admin/locks): закрыто группе, TEST — нет', async () => {
  const app = createApp();
  // закрыть тему «intro» всей группе ib-2 и поставить просроченный дедлайн на «vars»
  db.setTopicOverride({ subject: 'bash', topicKey: 'intro', scope: 'group', target: 'ib-2', mode: 'lock', by: 'teach-b' });
  db.setTopicOverride({ subject: 'bash', topicKey: 'vars', scope: 'group', target: 'ib-2', mode: 'deadline', deadline: new Date(Date.now() - 1000).toISOString(), by: 'teach-b' });

  const ib = await loginAs(app, 'ib-1');
  assert.strictEqual((await ib.get(`${BASE}/intro/theory`)).status, 423);
  assert.strictEqual((await ib.get(`${BASE}/vars/theory`)).status, 423);
  // API практики закрытой темы тоже 423
  const check = await ib.post(`${BASE}/intro/intro-01/check`).send({ code: 'echo "Привет, мир!"' });
  assert.strictEqual(check.status, 423);
  // на странице предмета — бейдж «закрыто»
  const page = (await ib.get(BASE)).text;
  assert.match(page, /topic-lock-badge/);

  // TEST (hasFullAccess) не блокируется
  const test1 = await loginAs(app, 'test-1');
  assert.strictEqual((await test1.get(`${BASE}/intro/theory`)).status, 200);
});

test('персональное открытие темы студенту в обход группового замка', async () => {
  const app = createApp();
  db.setTopicOverride({ subject: 'bash', topicKey: 'intro', scope: 'group', target: 'ib-2', mode: 'lock', by: 'teach-b' });
  db.setTopicOverride({ subject: 'bash', topicKey: 'intro', scope: 'student', target: 'ib-1', mode: 'allow', by: 'teach-b' });
  const ib = await loginAs(app, 'ib-1');
  assert.strictEqual((await ib.get(`${BASE}/intro/theory`)).status, 200);
});

test('админка: матрица, карточка студента и сброс прогресса', async () => {
  const app = createApp();
  const student = await loginAs(app, 'test-1');
  await student.post(`${BASE}/intro/intro-01/check`).send({ code: 'echo "Привет, мир!"' });
  const q = course.QUIZ_BY_ID.get('intro-q01');
  await student.post(`${BASE}/intro/quiz/intro-q01/answer`).send({ choice: q.answer });

  const teacher = await loginAs(app, 'teach-b');
  const matrix = await teacher.get('/admin/bash-course');
  assert.strictEqual(matrix.status, 200);
  assert.match(matrix.text, /Тест Студент/);
  const card = await teacher.get('/admin/bash-course/students/test-1');
  assert.strictEqual(card.status, 200);
  assert.match(card.text, /Введение в bash-скрипты/);

  const reset = await teacher.post('/admin/bash-course/students/test-1/reset');
  assert.strictEqual(reset.status, 302);
  const after = course.topicFor({ id: 'test-1', role: 'student', group: 'TEST' }, 'intro');
  assert.strictEqual(after.solved, 0);
  assert.strictEqual(after.quizSolved, 0);
});
