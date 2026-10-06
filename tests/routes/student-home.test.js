const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const db = require('../../src/db');
const { seedAssignment, cleanupContentFiles } = require('../helpers/fixtures');

async function loginAs(app, studentId) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId, password: DEFAULT_PASSWORD });
  return agent;
}

test.beforeEach(() => db.__resetForTests());
test.after(() => cleanupContentFiles());

function mainOf(html) {
  return html.slice(html.indexOf('<main'));
}

test('student home is a standalone page with SQL, Python and JavaScript cards', async () => {
  seedAssignment({ title: 'Задание по курсу', mdPath: 'home-a.md' });
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/');
  assert.strictEqual(res.status, 200);
  assert.doesNotMatch(res.text, /id="sidebar"/);
  for (const key of ['sql', 'python', 'javascript']) {
    assert.match(res.text, new RegExp(`href="/subjects/${key}"`));
  }
  assert.match(res.text, /Задание по курсу/);
});

test('Python and JavaScript pages list the shared assignments and their own task bank', async () => {
  const mine = seedAssignment({ title: 'Групповое задание', mdPath: 'home-b.md' });
  db.createSubmission({ assignmentId: mine.id, studentId: 'student-1', files: ['s.zip'] });
  seedAssignment({ title: 'Чужое персональное', mdPath: 'individual/student-2/x.md', targetType: 'individual', targetStudentId: 'student-2' });

  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  for (const lang of ['python', 'javascript']) {
    const res = await agent.get(`/subjects/${lang}`);
    assert.strictEqual(res.status, 200);
    const main = mainOf(res.text);
    assert.match(main, /Групповое задание/);
    assert.match(main, /На проверке/);
    assert.match(main, new RegExp(`href="/assignment/${mine.id}\\?subject=${lang}"`));
    assert.doesNotMatch(res.text, /Чужое персональное/);
    const bank = db.getLanguageExercises(lang);
    assert.ok(bank.length > 0);
    assert.match(main, new RegExp(`href="/subjects/${lang}/bank/${bank[0].id}"`));
  }
  // The Python page links only Python bank tasks.
  const py = mainOf((await agent.get('/subjects/python')).text);
  assert.doesNotMatch(py, /\/bank\/javascript-/);
});

test('each subject page has its own navigation', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const sidebarOf = (html) => html.slice(html.indexOf('id="sidebar"'), html.indexOf('</nav>', html.indexOf('id="sidebar"')));

  const sql = sidebarOf((await agent.get('/subjects/sql')).text);
  assert.match(sql, /\/trainer\/theory\/create_table/);
  assert.doesNotMatch(sql, /Банк задач/);

  const py = sidebarOf((await agent.get('/subjects/python')).text);
  assert.match(py, /Банк задач/);
  assert.match(py, /\/subjects\/python\/bank\//);
  assert.doesNotMatch(py, /\/trainer\//);
  assert.doesNotMatch(py, /\/subjects\/javascript\/bank\//);

  const theory = sidebarOf((await agent.get('/trainer/theory/distinct')).text);
  assert.doesNotMatch(theory, /Банк задач/);
  assert.match(theory, /href="\/"/);
});

test('a bank task page renders with neighbours and 404s for unknown ids or languages', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const bank = db.getLanguageExercises('javascript');
  const res = await agent.get(`/subjects/javascript/bank/${bank[1].id}`);
  assert.strictEqual(res.status, 200);
  assert.match(res.text, new RegExp(bank[1].title));
  assert.match(res.text, new RegExp(`/subjects/javascript/bank/${bank[0].id}`));
  assert.match(res.text, new RegExp(`/subjects/javascript/bank/${bank[2].id}`));
  assert.strictEqual((await agent.get(`/subjects/python/bank/${bank[1].id}`)).status, 404);
  assert.strictEqual((await agent.get('/subjects/ruby/bank/x')).status, 404);
});

test('an assignment page keeps the navigation of the language it was opened from', async () => {
  const a = seedAssignment({ title: 'Общее задание', mdPath: 'test-smoke/shared.md', markdown: '# Общее\n' });
  const app = createApp();
  const agent = await loginAs(app, 'student-1');

  const fromJs = await agent.get(`/assignment/${a.id}?subject=javascript`);
  assert.match(fromJs.text, /href="\/subjects\/javascript">JavaScript<\/a>/);
  // Without the parameter the last opened language is remembered.
  const again = await agent.get(`/assignment/${a.id}`);
  assert.match(again.text, /href="\/subjects\/javascript">JavaScript<\/a>/);
});

test('an unsubmitted assignment past its due date is marked overdue', async () => {
  seedAssignment({ title: 'Старое задание', mdPath: 'home-c.md', dueDate: '2020-01-01' });
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/subjects/python');
  assert.match(res.text, /status-pill-overdue/);
  // Overdue work isn't offered as "upcoming" on the home page.
  assert.doesNotMatch((await agent.get('/')).text, /Старое задание/);
});

test('SQL subject page lists topics with theory and practice links', async () => {
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/subjects/sql');
  assert.strictEqual(res.status, 200);
  const main = mainOf(res.text);
  assert.match(main, /href="\/trainer\/theory\/create_table"/);
  assert.match(main, /href="\/trainer\/practice\/create_table"/);
  // Later topics are locked for a fresh student: no practice link yet.
  assert.doesNotMatch(main, /href="\/trainer\/practice\/group_by"/);
  assert.match(main, /Продолжить:/);
});

test('unknown subject is a 404 and teachers are sent to the admin panel', async () => {
  const app = createApp();
  const student = await loginAs(app, 'student-1');
  assert.strictEqual((await student.get('/subjects/nope')).status, 404);
  const teacher = await loginAs(app, 'teacher-1');
  const res = await teacher.get('/');
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/admin');
});

test('a TEST-group account sees assignments of every group and has the whole trainer unlocked', async () => {
  db.createUser({ id: 'tester', role: 'student', name: 'Тестовый Студент', group: 'TEST', mustChangePassword: false });
  const other = seedAssignment({ title: 'Только для IT-22', mdPath: 'test-smoke/only-it22.md', targetGroup: 'IT-22', markdown: '# Только для IT-22\n' });

  const app = createApp();
  const tester = await loginAs(app, 'tester');
  assert.match((await tester.get('/')).text, /Только для IT-22/);
  assert.strictEqual((await tester.get(`/assignment/${other.id}`)).status, 200);
  const last = db.getSqlExercises().at(-1);
  assert.strictEqual((await tester.get(`/trainer/${last.id}`)).status, 200);

  // Regular students keep the group filter and the sequential unlock.
  const student = await loginAs(app, 'student-1');
  assert.strictEqual((await student.get(`/assignment/${other.id}`)).status, 404);
  assert.strictEqual((await student.get(`/trainer/${last.id}`)).status, 403);
  // TEST is not offered to teachers as a target group.
  assert.ok(!db.getDistinctStudentGroups().includes('TEST'));
});
