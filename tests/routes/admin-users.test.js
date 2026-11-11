const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');

const app = createApp();

test.beforeEach(() => {
  db.__resetForTests();
  db.createUser({ id: 'teach-u', role: 'teacher', name: 'Препод', group: null, mustChangePassword: false });
  db.createUser({ id: 'st-ib-1', role: 'student', name: 'Ибрагим', group: 'ib-2', mustChangePassword: false });
});

async function teacher() {
  const a = request.agent(app);
  await a.post('/login').send({ studentId: 'teach-u', password: DEFAULT_PASSWORD });
  return a;
}

test('раздел «Пользователи» открывается и показывает студента', async () => {
  const t = await teacher();
  const r = await t.get('/admin/users');
  assert.strictEqual(r.status, 200);
  assert.match(r.text, /Пользователи/);
  assert.match(r.text, /st-ib-1/);
  assert.match(r.text, /Создать аккаунт/);
  assert.match(r.text, /Массовое добавление студентов/);
});

test('создание преподавателя (без группы) и сброс его пароля', async () => {
  const t = await teacher();
  const r = await t.post('/admin/users/add').type('form').send({ id: 'teach-900', name: 'Новый Препод', role: 'teacher', group: 'ib-2' });
  assert.strictEqual(r.status, 302);
  const u = db.getUserById('teach-900');
  assert.ok(u);
  assert.strictEqual(u.role, 'teacher');
  assert.ok(!u.group, 'у преподавателя группа не задаётся');
  assert.strictEqual(u.mustChangePassword, true);
  assert.ok(db.verifyUserCredentials('teach-900', DEFAULT_PASSWORD));
  // сброс пароля преподавателю тоже работает
  db.setUserPassword('teach-900', 'Svoy-2026');
  const rr = await t.post('/admin/users/teach-900/reset-password').type('form').send({});
  assert.strictEqual(rr.status, 302);
  assert.ok(db.verifyUserCredentials('teach-900', DEFAULT_PASSWORD), 'вход общим паролем после сброса');
});

test('массовое добавление студентов в группу', async () => {
  const t = await teacher();
  const list = 'st-ib-810; Иванов Иван\nst-ib-811, Петров Пётр\nst-ib-812 Сидорова Анна\nst-ib-1 дубликат\nплохой id; X';
  const r = await t.post('/admin/users/bulk').type('form').send({ group: 'ib-2', list });
  assert.strictEqual(r.status, 302);
  assert.strictEqual(db.getUserById('st-ib-810').group, 'ib-2');
  assert.strictEqual(db.getUserById('st-ib-810').name, 'Иванов Иван');
  assert.strictEqual(db.getUserById('st-ib-811').name, 'Петров Пётр');
  assert.strictEqual(db.getUserById('st-ib-812').name, 'Сидорова Анна');
  assert.ok(db.verifyUserCredentials('st-ib-812', DEFAULT_PASSWORD));
  // дубликат (st-ib-1 уже есть) и плохой id — пропущены, аккаунты не перезаписаны/не созданы
  assert.strictEqual(db.getUserById('st-ib-1').name, 'Ибрагим');
});

test('добавление студента в группу', async () => {
  const t = await teacher();
  const r = await t.post('/admin/users/add').type('form').send({ id: 'st-ib-900', name: 'Новый Студент', group: 'ib-2' });
  assert.strictEqual(r.status, 302);
  const u = db.getUserById('st-ib-900');
  assert.ok(u);
  assert.strictEqual(u.group, 'ib-2');
  assert.strictEqual(u.mustChangePassword, true);
  // вход новым общим паролем работает
  assert.ok(db.verifyUserCredentials('st-ib-900', DEFAULT_PASSWORD));
  // дубликат — отклоняется
  const dup = await t.post('/admin/users/add').type('form').send({ id: 'st-ib-900', name: 'Ещё', group: 'ib-2' });
  assert.strictEqual(dup.status, 302);
  // плохой id
  await t.post('/admin/users/add').type('form').send({ id: 'плохой id', name: 'X', group: 'ib-2' });
  assert.ok(!db.getUserById('плохой id'));
});

test('сброс пароля студента (временный + смена при входе)', async () => {
  const t = await teacher();
  // сменим пароль, чтобы увидеть сброс
  db.setUserPassword('st-ib-1', 'Svoy-2026');
  assert.ok(db.verifyUserCredentials('st-ib-1', 'Svoy-2026'));
  const r = await t.post('/admin/users/st-ib-1/reset-password').type('form').send({ group: 'ib-2' });
  assert.strictEqual(r.status, 302);
  assert.ok(db.verifyUserCredentials('st-ib-1', DEFAULT_PASSWORD), 'вход общим паролем после сброса');
  assert.strictEqual(db.getUserById('st-ib-1').mustChangePassword, true);
});

test('не-преподаватель не имеет доступа к разделу', async () => {
  const a = request.agent(app);
  await a.post('/login').send({ studentId: 'st-ib-1', password: DEFAULT_PASSWORD });
  const r = await a.get('/admin/users');
  assert.notStrictEqual(r.status, 200);
});
