const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');

const app = createApp();
const TITLE = 'Анализатор журналов сервера на SQLite';
const MD_PATH = 'section-python-analiz-dannyh/analizator-zhurnalov-servera-na-sqlite.md';

function issueForGroup(group) {
  const a = db.createAssignment({
    courseId: 'course-1', title: TITLE, mdPath: MD_PATH,
    targetType: 'group', targetGroup: group, dueDate: '2026-12-31',
  });
  db.setAssignmentCodeFiles(a.id, ['main.py']);
  return a;
}

test.beforeEach(() => {
  db.__resetForTests();
  db.createUser({ id: 'st-ib-1', role: 'student', name: 'Ибрагим', group: 'ib-2', mustChangePassword: false });
  db.createUser({ id: 'st-zz-1', role: 'student', name: 'Чужой', group: 'zz-1', mustChangePassword: false });
});

async function login(id) {
  const a = request.agent(app);
  await a.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return a;
}

test('задание видно студенту ib-2 в предмете Python и открывает онлайн-редактор', async () => {
  const a = issueForGroup('ib-2');
  const agent = await login('st-ib-1');

  const page = await agent.get('/subjects/python');
  assert.strictEqual(page.status, 200);
  assert.match(page.text, new RegExp(TITLE));

  const view = await agent.get(`/assignment/${a.id}`);
  assert.strictEqual(view.status, 200);
  assert.match(view.text, /code-editor\.js/); // режим редактора
  assert.match(view.text, /sqlite3/); // подсказка про sqlite3 в браузере
});

test('студент другой группы это задание не видит', async () => {
  issueForGroup('ib-2');
  const agent = await login('st-zz-1');
  const page = await agent.get('/subjects/python');
  // если python доступен — задания ib-2 там нет; если недоступен — 404, тоже не видит
  if (page.status === 200) assert.doesNotMatch(page.text, new RegExp(TITLE));
});

test('относится к Python (а не к JavaScript) по правилу assignments.json', () => {
  const { lessonForAssignment } = require('../../src/lib/python-course');
  assert.strictEqual(lessonForAssignment(MD_PATH), 'sqlite-2');
});
