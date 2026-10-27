const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const emmet = require('../../src/lib/emmet');
const { checkAttempt } = require('../../src/lib/emmet/validate');

const ROOT = path.join(__dirname, '..', '..');

test.beforeEach(() => {
  db.__resetForTests();
  db.createUser({ id: 'web-1', role: 'student', name: 'Веб Студент', group: 'WEB', mustChangePassword: false });
  db.createUser({ id: 'ib-1', role: 'student', name: 'Иб Студент', group: 'IB', mustChangePassword: false });
});

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

test('every reference passes the server check, broken ones do not', () => {
  for (const id of emmet.BY_ID.keys()) {
    const exercise = emmet.BY_ID.get(id);
    assert.strictEqual(checkAttempt(exercise.expectedHtml, exercise), 'success', id);
    assert.strictEqual(checkAttempt(exercise.expectedHtml.replace(/\n\s*/g, ''), exercise), 'success', `${id} в одну строку`);
    assert.notStrictEqual(checkAttempt(`<p>${exercise.expectedHtml}</p>`, exercise), 'success', `${id} в лишнем <p>`);
    assert.notStrictEqual(checkAttempt(exercise.expectedHtml.replace(/<(\w+)/, (m, tag) => (tag === 'aside' ? '<section' : '<aside')), exercise), 'success', `${id} другой тег`);
    assert.strictEqual(checkAttempt(exercise.expectedHtml, exercise, { handwritten: exercise.mode === 'emmet' }), exercise.mode === 'emmet' ? 'error' : 'success', `${id} руками`);
  }
  const card = emmet.BY_ID.get('practice-01');
  assert.strictEqual(checkAttempt('<p class="caption">Другое</p>', card), 'partial');
  assert.strictEqual(checkAttempt('<p class="caption">Фото дня', card), 'error');
});

test('the plan: 12 lessons, then personal sets of 10 with a condition and 10 without hints', () => {
  const ids = emmet.createAssignment();
  assert.strictEqual(ids.length, 20);
  assert.ok(emmet.isValidAssignment(ids));
  const plan = emmet.planOf('web-1');
  assert.deepStrictEqual(plan.map((id) => emmet.BY_ID.get(id).section), [
    ...Array(12).fill('lesson'), ...Array(10).fill('emmet'), ...Array(10).fill('blind'),
  ]);
  assert.deepStrictEqual(emmet.planOf('web-1'), plan, 'the set does not change');
  assert.ok(!plan.some((id) => id.startsWith('containers-')), 'containers moved to docs/emmet/containers');
});

test('a set issued before the blind exercises is kept and extended', () => {
  const old = emmet.createAssignment().slice(0, 10);
  db.setEmmetAssignment('web-1', old);
  const ids = emmet.assignmentOf('web-1');
  assert.deepStrictEqual(ids.slice(0, 10), old);
  assert.ok(emmet.isValidAssignment(ids));
  assert.deepStrictEqual(db.getEmmetAssignment('web-1'), ids);
});

test('every student sees the trainer, a new account in a new group too; the page loads the bundled client', async () => {
  const app = createApp();
  assert.strictEqual((await request(app).get('/subjects/emmet')).status, 302);
  db.createUser({ id: 'new-1', role: 'student', name: 'Новый Студент', group: 'NEW-26', mustChangePassword: false });
  for (const id of ['web-1', 'ib-1', 'new-1']) {
    const agent = await loginAs(app, id);
    const page = await agent.get('/subjects/emmet');
    assert.strictEqual(page.status, 200, id);
    assert.match(page.text, /src="\/vendor\/emmet\/emmet\.js"/);
    assert.match((await agent.get('/')).text, /href="\/subjects\/emmet"/);
  }
  // В админке новая группа появляется сама (фильтр и «Завершить занятие»).
  assert.ok(require('../../src/lib/emmet').emmetGroups().includes('NEW-26'));
});

test('the API gives expected HTML without the practice references or levels; blind ones carry only the HTML', async () => {
  const web = await loginAs(createApp(), 'web-1');
  const res = await web.get('/subjects/emmet/api/me');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.exercises.length, 32);
  for (const e of res.body.exercises) {
    assert.ok(e.expectedHtml && e.title, e.id);
    assert.strictEqual(e.emmetExpression, undefined);
    assert.strictEqual(e.difficulty, undefined);
    if (e.section === 'lesson') assert.ok(e.demo && e.hints.length && e.solution && e.description, e.id);
    else assert.strictEqual(e.solution, undefined, e.id);
    if (e.section === 'emmet') assert.ok(e.description, e.id);
    if (e.section === 'blind') {
      assert.strictEqual(e.description, '', e.id);
      assert.strictEqual(e.title, 'Повторите образец', 'the bank title is not a hint');
    }
  }
  assert.doesNotMatch(JSON.stringify(res.body), /emmetExpression|difficulty/);
  assert.deepStrictEqual(res.body.progress.solved, []);
});

test('opened hints in the lessons are counted; practice exercises take no hint events', async () => {
  const web = await loginAs(createApp(), 'web-1');
  const plan = emmet.planOf('web-1');
  const send = (body) => web.post('/subjects/emmet/api/events').send(body);
  assert.strictEqual((await send({ type: 'hint', exerciseId: plan[0], level: 1 })).status, 200);
  assert.strictEqual((await send({ type: 'hint', exerciseId: plan[0], level: 3, solution: true })).status, 200);
  assert.strictEqual((await send({ type: 'hint', exerciseId: plan[12], level: 1 })).status, 400);
  const stats = emmet.progressMap('web-1').get(plan[0]);
  assert.strictEqual(stats.hints, 3);
  assert.strictEqual(stats.solutionShown, true);
});

test('attempts are rechecked by the server; the browser status is not trusted', async () => {
  const web = await loginAs(createApp(), 'web-1');
  const [first] = (await web.get('/subjects/emmet/api/me')).body.exercises;
  const other = emmet.EXERCISES.find((e) => !emmet.planOf('web-1').includes(e.id));
  assert.strictEqual((await web.post('/subjects/emmet/api/events').send({ type: 'open', exerciseId: other.id })).status, 400);

  let res = await web.post('/subjects/emmet/api/events').send({ type: 'attempt', exerciseId: first.id, status: 'success', code: '<b>не то</b>' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'mismatch');
  res = await web.post('/subjects/emmet/api/events').send({ type: 'attempt', exerciseId: first.id, status: 'success', code: first.expectedHtml, handwritten: true });
  assert.strictEqual(res.body.status, 'error');
  res = await web.post('/subjects/emmet/api/events').send({ type: 'attempt', exerciseId: first.id, status: 'success', code: first.expectedHtml });
  assert.strictEqual(res.body.status, 'success');
  await web.post('/subjects/emmet/api/events').send({ type: 'paste', exerciseId: first.id, kind: 'paste' });
  await web.post('/subjects/emmet/api/events').send({ type: 'away', exerciseId: first.id, ms: 30000 });

  const stats = emmet.progressMap('web-1').get(first.id);
  assert.strictEqual(stats.attempts, 3);
  assert.strictEqual(stats.handwritten, 1);
  assert.strictEqual(stats.clientMismatch, 2);
  assert.strictEqual(stats.attemptsToSolve, 3);
  assert.strictEqual(stats.pastes, 1);
  assert.strictEqual(stats.aways, 1);
  assert.deepStrictEqual((await web.get('/subjects/emmet/api/me')).body.progress.solved, [first.id]);
  assert.strictEqual(db.getEmmetEvents('web-1').length, 5);
});

test('a closed session stops the group, the teacher reopens it', async () => {
  const app = createApp();
  const web = await loginAs(app, 'web-1');
  const teacher = await loginAs(app, 'teacher-1');
  await teacher.post('/admin/emmet/session').type('form').send({ group: 'WEB', closed: '1' });
  const res = await web.get('/subjects/emmet/api/me');
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.closed, true);
  assert.deepStrictEqual((await web.get('/subjects/emmet/api/session')).body, { closed: true });
  await teacher.post('/admin/emmet/session').type('form').send({ group: 'WEB', closed: '0' });
  assert.strictEqual((await web.get('/subjects/emmet/api/me')).status, 200);
});

test('admin pages: matrix, student card, new set, reset, CSV', async () => {
  const app = createApp();
  const web = await loginAs(app, 'web-1');
  const [first] = (await web.get('/subjects/emmet/api/me')).body.exercises;
  await web.post('/subjects/emmet/api/events').send({ type: 'attempt', exerciseId: first.id, status: 'success', code: first.expectedHtml });
  const teacher = await loginAs(app, 'teacher-1');
  for (const url of ['/admin/emmet', '/admin/emmet?tab=lesson', '/admin/emmet?tab=blind', '/admin/emmet?pick=1', '/admin/emmet/students/web-1']) {
    const res = await teacher.get(url);
    assert.strictEqual(res.status, 200, url);
  }
  assert.match((await teacher.get('/admin/emmet/students/web-1')).text, /Код решения/);
  const csv = await teacher.get('/admin/emmet.csv');
  assert.match(csv.headers['content-type'], /text\/csv/);
  assert.match(csv.text, /Веб Студент;?/);
  assert.strictEqual((await web.get('/admin/emmet')).status, 403);

  await teacher.post('/admin/emmet/students/web-1/reset');
  assert.strictEqual(db.getEmmetProgress('web-1').length, 0);
  const before = db.getEmmetAssignment('web-1');
  await teacher.post('/admin/emmet/students/web-1/reassign');
  assert.ok(emmet.isValidAssignment(db.getEmmetAssignment('web-1')));
  assert.ok(before);
});

test('the client bundle is served by the site and refers to no external host', async () => {
  const app = createApp();
  for (const url of ['/vendor/emmet/emmet.js', '/vendor/emmet/emmet.css']) assert.strictEqual((await request(app).head(url)).status, 200, url);
  const js = fs.readFileSync(path.join(ROOT, 'public', 'vendor', 'emmet', 'emmet.js'), 'utf8');
  assert.doesNotMatch(js, /cdn\.jsdelivr\.net|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.match(js, /\/subjects\/emmet\/api/);
  assert.doesNotMatch(js, /emmetExpression/, 'the bundle does not carry the references');
  assert.doesNotMatch(js, /простая|средняя|сложная/, 'no difficulty levels for students');
});
