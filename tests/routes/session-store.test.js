const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { SqliteStore } = require('../../src/lib/session-store');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');

test.beforeEach(() => {
  db.__resetForTests();
});

async function login() {
  const res = await request(createApp()).post('/login').send({ studentId: 'student-1', password: DEFAULT_PASSWORD });
  assert.strictEqual(res.status, 302);
  const cookie = res.headers['set-cookie'].find((c) => c.startsWith('connect.sid='));
  assert.ok(cookie, 'session cookie');
  assert.match(cookie, /Expires=/, 'cookie outlives the browser window');
  return cookie.split(';')[0];
}

test('a login is stored in the sessions table and survives a new app (restart)', async () => {
  const cookie = await login();
  const sid = decodeURIComponent(cookie.split('=')[1]).slice(2).split('.')[0];
  const raw = db.getSession(sid, Date.now());
  assert.ok(raw, 'session row');
  assert.strictEqual(JSON.parse(raw).user.id, 'student-1');

  const res = await request(createApp()).get('/').set('Cookie', cookie);
  assert.strictEqual(res.status, 200);
});

test('logout deletes the session row', async () => {
  const cookie = await login();
  const sid = decodeURIComponent(cookie.split('=')[1]).slice(2).split('.')[0];
  await request(createApp()).post('/logout').set('Cookie', cookie);
  assert.strictEqual(db.getSession(sid, Date.now()), null);
  const res = await request(createApp()).get('/').set('Cookie', cookie);
  assert.strictEqual(res.status, 302);
});

test('an expired session is not accepted and gets purged', async () => {
  const cookie = await login();
  const sid = decodeURIComponent(cookie.split('=')[1]).slice(2).split('.')[0];
  db.touchSession(sid, Date.now() - 1000);
  const res = await request(createApp()).get('/').set('Cookie', cookie);
  assert.strictEqual(res.status, 302);
  new SqliteStore(); // purges on start
  assert.strictEqual(db.purgeExpiredSessions(Date.now()), 0);
});
