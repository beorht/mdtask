const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');

test('GET /login renders the login form', async () => {
  const app = createApp();
  const res = await request(app).get('/login');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Student ID/);
});

test('POST /login with unknown id re-renders form with an error', async () => {
  const app = createApp();
  const res = await request(app).post('/login').send({ studentId: 'unknown' });
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /не найден/);
});

test('POST /login with a valid student id redirects to student dashboard', async () => {
  const app = createApp();
  const res = await request(app).post('/login').send({ studentId: 'student-1' });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/');
});

test('POST /login with a valid teacher id redirects to teacher dashboard', async () => {
  const app = createApp();
  const res = await request(app).post('/login').send({ studentId: 'teacher-1' });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/teacher');
});

test('requireRole blocks access without a session', async () => {
  const app = createApp();
  const res = await request(app).get('/teacher');
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, '/login');
});
