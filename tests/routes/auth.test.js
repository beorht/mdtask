const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');

test.beforeEach(() => {
  db.__resetForTests();
});

test('GET /login renders the login form', async () => {
  const app = createApp();
  const res = await request(app).get('/login');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Student ID/);
});

test('POST /login with unknown id re-renders form with an error', async () => {
  const app = createApp();
  const res = await request(app).post('/login').send({ studentId: 'unknown', password: DEFAULT_PASSWORD });
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Неверный/);
});

test('POST /login with a wrong password re-renders form with an error', async () => {
  const app = createApp();
  const res = await request(app).post('/login').send({ studentId: 'student-1', password: 'wrong-password' });
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Неверный/);
});

test('POST /login with a valid student id and password redirects to student dashboard', async () => {
  const app = createApp();
  const res = await request(app).post('/login').send({ studentId: 'student-1', password: DEFAULT_PASSWORD });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/');
});

test('POST /login with a valid teacher id and password redirects to the admin panel', async () => {
  const app = createApp();
  const res = await request(app).post('/login').send({ studentId: 'teacher-1', password: DEFAULT_PASSWORD });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/admin');
});

test('a user who must change their password is redirected to /change-password on login and blocked elsewhere', async () => {
  db.setMustChangePasswordForTests('student-1');
  const app = createApp();
  const agent = request.agent(app);

  const loginRes = await agent.post('/login').send({ studentId: 'student-1', password: DEFAULT_PASSWORD });
  assert.strictEqual(loginRes.status, 302);
  assert.strictEqual(loginRes.headers.location, '/change-password');

  const dashboardRes = await agent.get('/');
  assert.strictEqual(dashboardRes.status, 302);
  assert.strictEqual(dashboardRes.headers.location, '/change-password');
});

test('changing the password clears the forced flag and unlocks the dashboard', async () => {
  db.setMustChangePasswordForTests('student-1');
  const app = createApp();
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: 'student-1', password: DEFAULT_PASSWORD });

  const changeRes = await agent
    .post('/change-password')
    .send({ newPassword: 'my-new-password', confirmPassword: 'my-new-password' });
  assert.strictEqual(changeRes.status, 302);
  assert.strictEqual(changeRes.headers.location, '/');

  const dashboardRes = await agent.get('/');
  assert.strictEqual(dashboardRes.status, 200);
});

test('requireRole blocks access without a session', async () => {
  const app = createApp();
  const res = await request(app).get('/admin');
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/login');
});

const { PER_ACCOUNT_MAX } = require('../../src/lib/login-throttle');

test('brute force: login is blocked after too many failed attempts, even with the right password', async () => {
  const app = createApp();
  const agent = request.agent(app);
  for (let i = 0; i < PER_ACCOUNT_MAX; i += 1) {
    const r = await agent.post('/login').send({ studentId: 'student-1', password: 'wrong' });
    assert.strictEqual(r.status, 200, `attempt ${i} should just re-render`);
  }
  // Следующая попытка блокируется — даже с верным паролем.
  const blocked = await agent.post('/login').send({ studentId: 'student-1', password: DEFAULT_PASSWORD });
  assert.strictEqual(blocked.status, 429);
  assert.match(blocked.text, /Слишком много/);
});

test('brute force: a different account from the same client is not blocked', async () => {
  const app = createApp();
  const agent = request.agent(app);
  for (let i = 0; i < PER_ACCOUNT_MAX; i += 1) {
    await agent.post('/login').send({ studentId: 'student-1', password: 'wrong' });
  }
  // student-1 заблокирован, но teacher-1 — нет (ключ блокировки — IP + логин).
  const other = await agent.post('/login').send({ studentId: 'teacher-1', password: DEFAULT_PASSWORD });
  assert.strictEqual(other.status, 302);
  assert.strictEqual(other.headers.location, '/admin');
});

test('brute force: a successful login clears the failure counter', async () => {
  const app = createApp();
  const agent = request.agent(app);
  for (let i = 0; i < PER_ACCOUNT_MAX - 1; i += 1) {
    await agent.post('/login').send({ studentId: 'student-1', password: 'wrong' });
  }
  // Верный вход сбрасывает счётчик...
  const ok = await agent.post('/login').send({ studentId: 'student-1', password: DEFAULT_PASSWORD });
  assert.strictEqual(ok.status, 302);
  // ...поэтому снова можно ошибаться, и блокировки нет.
  const again = await agent.post('/login').send({ studentId: 'student-1', password: 'wrong' });
  assert.strictEqual(again.status, 200);
});
