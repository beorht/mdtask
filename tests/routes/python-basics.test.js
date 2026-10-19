const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const db = require('../../src/db');
const { TASKS, PYBASICS_TITLE } = require('../../src/lib/python-basics');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

function runsFor(task, wrongIndex = -1) {
  return task.tests.map((t, i) => ({ stdout: i === wrongIndex ? 'не то\n' : t.output, error: null, timeout: false }));
}

test.beforeEach(() => {
  db.__resetForTests();
  db.createUser({ id: 'tester', role: 'student', name: 'Тестовый Студент', group: 'TEST', mustChangePassword: false });
});

test('a regular student does not see the subject: no home card, 404 on every URL', async () => {
  const agent = await loginAs(createApp(), 'student-1');
  const home = await agent.get('/');
  assert.ok(!home.text.includes(PYBASICS_TITLE));
  assert.strictEqual((await agent.get('/subjects/pybasics')).status, 404);
  assert.strictEqual((await agent.get(`/subjects/pybasics/${TASKS[0].id}`)).status, 404);
  const check = await agent.post(`/subjects/pybasics/${TASKS[0].id}/check`).send({ code: 'x', runs: runsFor(TASKS[0]) });
  assert.strictEqual(check.status, 404);
});

test('TEST group: home card, subject page and a two-column task page without expected output of closed tests', async () => {
  const agent = await loginAs(createApp(), 'tester');
  const home = await agent.get('/');
  assert.ok(home.text.includes(PYBASICS_TITLE));
  const page = await agent.get('/subjects/pybasics');
  assert.strictEqual(page.status, 200);
  TASKS.forEach((t) => assert.match(page.text, new RegExp(t.title)));

  const task = TASKS[1];
  const res = await agent.get(`/subjects/pybasics/${task.id}`);
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /class="pyb-workspace"/);
  assert.match(res.text, /📖 Nazariya/);
  assert.match(res.text, /✓ Tekshirish/);
  assert.match(res.text, /<html lang="uz">/);
  assert.match(res.text, /id="pybEditor"/);
  assert.match(res.text, /\/js\/python-basics\.js/);
  const json = JSON.parse(res.text.match(/<script type="application\/json" id="pybTests">([\s\S]*?)<\/script>/)[1]);
  assert.strictEqual(json.length, task.tests.length);
  assert.ok(json.slice(task.openTests).every((t) => !('output' in t)));
  const closed = task.tests[task.tests.length - 1].output.split('\n')[3];
  assert.ok(!res.text.includes(closed), 'вывод закрытого теста не должен попадать на страницу');
});

test('check: wrong output is recorded but not solved; correct output solves and shows the next task', async () => {
  const agent = await loginAs(createApp(), 'tester');
  const task = TASKS[0];
  const wrong = await agent.post(`/subjects/pybasics/${task.id}/check`).send({ code: 'print(1)', runs: runsFor(task, 3) });
  assert.strictEqual(wrong.status, 200);
  assert.strictEqual(wrong.body.solved, false);
  assert.strictEqual(wrong.body.passed, task.tests.length - 1);
  assert.ok(!('expected' in wrong.body.tests[3]));

  const ok = await agent.post(`/subjects/pybasics/${task.id}/check`).send({ code: 'name = input()', runs: runsFor(task) });
  assert.strictEqual(ok.body.solved, true);
  assert.strictEqual(ok.body.next.id, TASKS[1].id);

  const p = db.getPythonBasicsProgress('tester').find((x) => x.taskId === task.id);
  assert.strictEqual(p.attempts, 2);
  assert.ok(p.solvedAt);
  assert.strictEqual(p.draft, 'name = input()');
  assert.strictEqual(db.getPythonBasicsAttempts('tester', task.id).length, 2);

  const bad = await agent.post(`/subjects/pybasics/${task.id}/check`).send({ code: 'x', runs: [] });
  assert.strictEqual(bad.status, 400);
});

test('draft autosave keeps the code for the task page', async () => {
  const agent = await loginAs(createApp(), 'tester');
  const saved = await agent.post(`/subjects/pybasics/${TASKS[2].id}/draft`).send({ code: 'price = 1  # черновик' });
  assert.strictEqual(saved.status, 200);
  const res = await agent.get(`/subjects/pybasics/${TASKS[2].id}`);
  assert.match(res.text, /price = 1  # черновик/);
});

test('group PRAK sees the course; tasks unlock in order', async () => {
  db.createUser({ id: 'prak-x', role: 'student', name: 'Prak Talaba', group: 'PRAK', mustChangePassword: false });
  {
    const agent = await loginAs(createApp(), 'prak-x');
    assert.ok((await agent.get('/')).text.includes(PYBASICS_TITLE));
    assert.strictEqual((await agent.get('/subjects/pybasics')).status, 200);
    assert.strictEqual((await agent.get(`/subjects/pybasics/${TASKS[1].id}`)).status, 404);
    const locked = await agent.post(`/subjects/pybasics/${TASKS[1].id}/check`).send({ code: 'x', runs: runsFor(TASKS[1]) });
    assert.strictEqual(locked.status, 403);
    await agent.post(`/subjects/pybasics/${TASKS[0].id}/check`).send({ code: 'x', runs: runsFor(TASKS[0]) });
    assert.strictEqual((await agent.get(`/subjects/pybasics/${TASKS[1].id}`)).status, 200);
  }
});

test('admin: results table and one student\'s attempts with code', async () => {
  const student = await loginAs(createApp(), 'tester');
  await student.post(`/subjects/pybasics/${TASKS[0].id}/check`).send({ code: 'name = input()\nprint(name)', runs: runsFor(TASKS[0], 0) });
  const admin = await loginAs(createApp(), 'teacher-1');
  const list = await admin.get('/admin/python-basics');
  assert.strictEqual(list.status, 200);
  assert.match(list.text, /Тестовый Студент/);
  assert.match(list.text, /Раздел открыт группам: <strong>PRAK<\/strong>/);
  const detail = await admin.get(`/admin/python-basics/tester/${TASKS[0].id}`);
  assert.strictEqual(detail.status, 200);
  assert.match(detail.text, /print\(name\)/);
  assert.match(detail.text, new RegExp(`Пройдено ${TASKS[0].tests.length - 1} из ${TASKS[0].tests.length}`));
  assert.strictEqual((await admin.get('/admin/python-basics/tester/nope')).status, 404);
});
