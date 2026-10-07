const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const { stopTerminal } = require('../../src/lib/ib-bridge');
const db = require('../../src/db');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

test.beforeEach(() => db.__resetForTests());
test.after(() => stopTerminal());

test('the information-security card appears on the home page only once a task is assigned', async () => {
  const app = createApp();
  let agent = await loginAs(app, 'student-1');
  assert.doesNotMatch((await agent.get('/')).text, /href="\/subjects\/ib"/);

  db.seedCaesarSecretForTests('student-1');
  agent = await loginAs(app, 'student-1');
  const res = await agent.get('/');
  assert.match(res.text, /href="\/subjects\/ib"/);
  assert.match(res.text, /Информационная безопасность/);
});

test('the subject page lists the assigned task with its status', async () => {
  db.seedCaesarSecretForTests('student-1', { solved: true });
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/subjects/ib');
  assert.strictEqual(res.status, 200);
  const main = res.text.slice(res.text.indexOf('<main'));
  assert.match(main, /href="\/subjects\/ib\/caesar"/);
  assert.match(main, /Задание №3\. Доступ к защищённой базе данных/);
  assert.match(main, /Выполнено/);
});

test('the task page embeds the terminal; unassigned or unknown tasks are 404', async () => {
  db.seedCaesarSecretForTests('student-1');
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/subjects/ib/caesar');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /<iframe class="ib-terminal" src="\/ib\/caesar\/terminal"/);
  assert.strictEqual((await agent.get('/subjects/ib/nope')).status, 404);

  const other = await loginAs(app, 'student-2');
  assert.strictEqual((await other.get('/subjects/ib/caesar')).status, 404);
  assert.strictEqual((await other.get('/ib/caesar/terminal')).status, 404);
});

test('the terminal page is IBEmulator\'s TTY pointed at this task\'s API', async () => {
  db.seedCaesarSecretForTests('student-1');
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.get('/ib/caesar/terminal');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /window\.SECLAB_API = "\/ib\/caesar\/api"/);
  assert.match(res.text, /seclab login: /);
});

test('the terminal login only accepts the logged-in student', async () => {
  db.seedCaesarSecretForTests('student-1');
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.post('/ib/caesar/api/login').send({ studentId: 'student-2', password: DEFAULT_PASSWORD });
  assert.deepStrictEqual(res.body, { ok: false, error: 'Неверный логин или пароль' });
});

test('terminal commands go to the Python backend, which wants a terminal session first', async () => {
  db.seedCaesarSecretForTests('student-1');
  const app = createApp();
  const agent = await loginAs(app, 'student-1');
  const res = await agent.post('/ib/caesar/api/run').send({ cmd: 'ls' });
  assert.strictEqual(res.status, 401);
  assert.deepStrictEqual(res.body, { error: 'not authenticated' });
});

test('the old /ctf/caesar terminal redirects to the task page', async () => {
  const app = createApp();
  const res = await request(app).get('/ctf/caesar');
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/subjects/ib/caesar');
});

test('the task password is not accepted for the platform login', async () => {
  db.seedCaesarSecretForTests('student-1');
  const app = createApp();
  const res = await request(app).post('/login').send({ studentId: 'student-1', password: 'Falcon123' });
  assert.match(res.text, /Неверный ID или пароль/);
});

test('teacher sees the task results with answers in /admin/ib', async () => {
  db.seedCaesarSecretForTests('student-1', { solved: true });
  db.seedCaesarSecretForTests('student-2');
  const app = createApp();
  const agent = await loginAs(app, 'teacher-1');
  const res = await agent.get('/admin/ib');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Иван Иванов/);
  assert.match(res.text, /Мария Петрова/);
  assert.match(res.text, /Falcon123/);
  assert.match(res.text, /~\/\.ssh\/\.config\.bak/);
  assert.match(res.text, /href="\/admin\/ib"/);
});
