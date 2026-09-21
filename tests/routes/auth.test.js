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

test('POST /login with a valid teacher id and password redirects to teacher dashboard', async () => {
  const app = createApp();
  const res = await request(app).post('/login').send({ studentId: 'teacher-1', password: DEFAULT_PASSWORD });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/teacher');
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
  const res = await request(app).get('/teacher');
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/login');
});
