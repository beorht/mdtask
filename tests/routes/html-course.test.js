const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const course = require('../../src/lib/html-course');
const { renderTheory } = require('../../src/lib/html-course/theory');
const { checkAttempt } = require('../../src/lib/emmet/validate');

const ROOT = path.join(__dirname, '..', '..');

test.beforeEach(() => {
  db.__resetForTests();
  db.createUser({ id: 'test-1', role: 'student', name: 'Тест Студент', group: 'TEST', mustChangePassword: false });
  db.createUser({ id: 'web-1', role: 'student', name: 'Веб Студент', group: 'WEB', mustChangePassword: false });
});

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

test('12 topics in order; the ready ones have theory and tasks with expected HTML', () => {
  assert.strictEqual(course.TOPICS.length, 12);
  assert.ok(course.TOPICS.every((t) => t.ready), 'all 12 topics are written');
  for (const t of course.TOPICS.filter((x) => x.ready)) {
    assert.ok(t.tasks.length >= 8 && t.tasks.length <= 10, t.key);
    assert.match(t.theoryMd, /^# /, t.key);
    for (const task of t.tasks) assert.ok(task.title && task.description && task.expectedHtml.includes('<'), task.id);
  }
  const texts = course.TOPICS.flatMap((t) => [t.title, t.lead, t.theoryMd, ...t.tasks.flatMap((x) => [x.title, x.description])]).join('\n');
  assert.doesNotMatch(texts, /лёгк|легк|средн(ий|яя|его) уровн|сложн(ый|ая) уровн|уровень сложности/i, 'no difficulty levels');
});

test('every expected HTML passes the server check, typed by hand too; a wrong one does not', () => {
  for (const task of course.TASK_BY_ID.values()) {
    assert.strictEqual(checkAttempt(task.expectedHtml, task), 'success', task.id);
    // В <pre> переносы — часть текста, склеивать их нельзя.
    if (!task.expectedHtml.includes('<pre')) assert.strictEqual(checkAttempt(task.expectedHtml.replace(/\n\s*/g, ''), task), 'success', `${task.id} в одну строку`);
    assert.notStrictEqual(checkAttempt(`<section>${task.expectedHtml}</section>`, task), 'success', `${task.id} в лишней обёртке`);
  }
});

test('theory examples are live and are not answers to the tasks (except topic 9, ported as is)', () => {
  for (const t of course.TOPICS.filter((x) => x.ready)) {
    const html = renderTheory(t.theoryMd);
    assert.match(html, /class="html-example"/, t.key);
    assert.doesNotMatch(html, /<h1/, 'the title comes from the page template');
    if (t.key === 'containers') continue; // перенесена из тренажёра Emmet как есть
    const examples = [...t.theoryMd.matchAll(/```(?:example|scheme)[^\n]*\n([\s\S]*?)```/g)].map((m) => m[1].replace(/\s+/g, ''));
    for (const task of t.tasks) assert.ok(!examples.includes(task.expectedHtml.replace(/\s+/g, '')), task.id);
  }
});

test('group web-1 sees only HTML and Emmet: home cards, other subjects 404, no shared assignments', async () => {
  const { seedAssignment } = require('../helpers/fixtures');
  db.createUser({ id: 'w1-1', role: 'student', name: 'Студент web-1', group: 'web-1', mustChangePassword: false });
  const shared = seedAssignment({ title: 'Общее задание', mdPath: 'web1-shared.md' });
  const app = createApp();
  const w1 = await loginAs(app, 'w1-1');
  const home = (await w1.get('/')).text;
  for (const key of ['html', 'emmet']) assert.match(home, new RegExp(`href="/subjects/${key}"`));
  for (const key of ['sql', 'python', 'javascript', 'ib']) assert.doesNotMatch(home, new RegExp(`href="/subjects/${key}"`));
  assert.doesNotMatch(home, /Общее задание/);
  assert.strictEqual((await w1.get('/subjects/html')).status, 200);
  assert.strictEqual((await w1.get('/subjects/emmet')).status, 200);
  for (const url of ['/subjects/python', '/subjects/sql', '/trainer', '/subjects/ib', '/ib/caesar/api/state']) {
    assert.strictEqual((await w1.get(url)).status, 404, url);
  }
  assert.notStrictEqual((await w1.get(`/assignment/${shared.id}`)).status, 200);
});

test('a logged-in student moved to another group gets the new group without logging in again', async () => {
  db.createUser({ id: 'mv-1', role: 'student', name: 'Переводимый', group: 'WEB', mustChangePassword: false });
  const app = createApp();
  const agent = await loginAs(app, 'mv-1');
  assert.strictEqual((await agent.get('/subjects/html')).status, 404);
  db.setStudentGroupForTests('mv-1', 'web-1');
  assert.strictEqual((await agent.get('/subjects/html')).status, 200);
  assert.strictEqual((await agent.get('/subjects/python')).status, 404);
});

test('only TEST sees the subject: home card, pages and API', async () => {
  const app = createApp();
  const web = await loginAs(app, 'web-1');
  assert.strictEqual((await web.get('/subjects/html')).status, 404);
  assert.strictEqual((await web.get('/subjects/html/api/basics/me')).status, 404);
  assert.doesNotMatch((await web.get('/')).text, /href="\/subjects\/html"/);
  const tester = await loginAs(app, 'test-1');
  assert.match((await tester.get('/')).text, /href="\/subjects\/html"/);
  const page = await tester.get('/subjects/html');
  assert.strictEqual(page.status, 200);
  assert.match(page.text, /Тема 1\. Как устроена веб-страница/);
  const theory = await tester.get('/subjects/html/basics/theory');
  assert.strictEqual(theory.status, 200);
  assert.match(theory.text, /html-examples\.js/);
  const practice = await tester.get('/subjects/html/basics/practice');
  assert.strictEqual(practice.status, 200);
  assert.match(practice.text, /\/vendor\/html-course\/html-course\.js/);
  assert.strictEqual((await tester.get('/subjects/html/no-such-topic/theory')).status, 404);
});

test('topics open in order: practice after the theory, the next topic after the practice', () => {
  course.HTML_GROUPS.push('WEB');
  try {
    const user = { id: 'web-1', role: 'student', group: 'WEB', name: 'Веб Студент' };
    let [basics, text] = course.topicsForStudent(user);
    assert.deepStrictEqual([basics.theoryOpen, basics.practiceOpen, text.theoryOpen], [true, false, false]);
    course.markTheoryRead(user, 'basics');
    [basics] = course.topicsForStudent(user);
    assert.strictEqual(basics.practiceOpen, true);
    for (const task of course.TOPIC_BY_KEY.get('basics').tasks) {
      course.recordEvent(user, 'basics', { type: 'attempt', exerciseId: task.id, status: 'success', code: task.expectedHtml });
    }
    [basics, text] = course.topicsForStudent(user);
    assert.strictEqual(basics.done, true);
    assert.deepStrictEqual([text.theoryOpen, text.practiceOpen], [true, false]);
  } finally {
    course.HTML_GROUPS.splice(course.HTML_GROUPS.indexOf('WEB'), 1);
  }
});

test('the API gives the topic tasks; attempts are rechecked by the server', async () => {
  const tester = await loginAs(createApp(), 'test-1');
  const me = await tester.get('/subjects/html/api/basics/me');
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.body.exercises.length, course.TOPIC_BY_KEY.get('basics').tasks.length);
  const [first] = me.body.exercises;
  assert.strictEqual(first.mode, 'html');
  const send = (body) => tester.post('/subjects/html/api/basics/events').send(body);
  assert.strictEqual((await send({ type: 'open', exerciseId: 'text-01' })).status, 400, 'a task of another topic');
  assert.strictEqual((await send({ type: 'attempt', exerciseId: first.id, status: 'success', code: '<b>не то</b>' })).body.status, 'mismatch');
  assert.strictEqual((await send({ type: 'attempt', exerciseId: first.id, status: 'success', code: first.expectedHtml })).body.status, 'success');
  await send({ type: 'paste', exerciseId: first.id, kind: 'paste' });
  const stats = course.progressMap('test-1').get(first.id);
  assert.strictEqual(stats.attempts, 2);
  assert.strictEqual(stats.clientMismatch, 1);
  assert.strictEqual(stats.pastes, 1);
  assert.deepStrictEqual((await tester.get('/subjects/html/api/basics/me')).body.progress.solved, [first.id]);
});

test('admin pages: matrix, student card with code, reset', async () => {
  const app = createApp();
  const tester = await loginAs(app, 'test-1');
  await tester.get('/subjects/html/basics/theory');
  const [first] = (await tester.get('/subjects/html/api/basics/me')).body.exercises;
  await tester.post('/subjects/html/api/basics/events').send({ type: 'attempt', exerciseId: first.id, status: 'success', code: first.expectedHtml });
  const teacher = await loginAs(app, 'teacher-1');
  const matrix = await teacher.get('/admin/html');
  assert.strictEqual(matrix.status, 200);
  assert.match(matrix.text, /Тест Студент/);
  assert.doesNotMatch(matrix.text, /Веб Студент/);
  const card = await teacher.get('/admin/html/students/test-1');
  assert.strictEqual(card.status, 200);
  assert.match(card.text, /Код решения/);
  await teacher.post('/admin/html/students/test-1/reset');
  assert.strictEqual(db.getHtmlProgress('test-1').length, 0);
  assert.strictEqual((await tester.get('/admin/html')).status, 403);
});

test('the practice client is served by the site and refers to no external host', async () => {
  const app = createApp();
  for (const url of ['/vendor/html-course/html-course.js', '/vendor/html-course/html-course.css', '/js/html-examples.js', '/css/html-boxes.css']) {
    assert.strictEqual((await request(app).head(url)).status, 200, url);
  }
  const js = fs.readFileSync(path.join(ROOT, 'public', 'vendor', 'html-course', 'html-course.js'), 'utf8');
  assert.doesNotMatch(js, /cdn\.jsdelivr\.net|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/);
});

test('login ID ignores letter case and spaces around it; the session keeps the real ID', async () => {
  db.createUser({ id: 'stWeb-777', role: 'student', name: 'Регистр', group: 'web-1' });
  const app = createApp();
  for (const id of ['stWeb-777', 'stweb-777', ' STWEB-777 ']) {
    const res = await request(app).post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
    assert.strictEqual(res.headers.location, '/change-password', id);
  }
  const bad = await request(app).post('/login').send({ studentId: 'stweb-777', password: 'wrong-pass' });
  assert.match(bad.text, /Неверный ID или пароль/);
  assert.strictEqual(db.verifyUserCredentials('STWEB-777', DEFAULT_PASSWORD).id, 'stWeb-777');
});
