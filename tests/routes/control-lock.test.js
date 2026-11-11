const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const { seedAssignment, cleanupContentFiles } = require('../helpers/fixtures');
const { controlLockFor } = require('../../src/lib/control-lock');

const app = createApp();
const DAY = 86400000;
const WEB_TITLE = 'Каталог на XML и DOM (двухстраничный сайт)';

async function login(id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

test.beforeEach(() => {
  db.__resetForTests();
  db.createUser({ id: 'st-ib', role: 'student', name: 'Ибрагим', group: 'ib-2', mustChangePassword: false });
  db.createUser({ id: 'stWeb', role: 'student', name: 'Вебер', group: 'web-2', mustChangePassword: false });
});

test('без назначенного окна практика не блокируется', () => {
  assert.strictEqual(controlLockFor({ id: 'st-ib', role: 'student', group: 'ib-2' }), null);
  assert.strictEqual(controlLockFor({ id: 'stWeb', role: 'student', group: 'web-2' }), null);
});

test('ИБ-контрольная: во время окна практика ib-2 закрыта, контрольная открыта', async () => {
  const now = Date.now();
  db.setMidWindow(new Date(now - DAY).toISOString(), new Date(now + DAY).toISOString());
  const a = await login('st-ib');
  // остальная практика закрыта
  const trainer = await a.get('/trainer');
  assert.strictEqual(trainer.status, 423);
  assert.match(trainer.text, /Закрыто на время контрольной/);
  // сама контрольная открыта
  assert.strictEqual((await a.get('/exam/ib-mid-1')).status, 200);
  // на главной — карточка-вход
  const home = await a.get('/');
  assert.match(home.text, /ИБ-контрольная/);

  // окно снято — практика снова доступна
  db.clearMidWindow();
  assert.notStrictEqual((await a.get('/trainer')).status, 423);
});

test('ИБ-контрольная: до начала и после конца не блокирует', async () => {
  const now = Date.now();
  db.setMidWindow(new Date(now + DAY).toISOString(), new Date(now + 2 * DAY).toISOString());
  const a = await login('st-ib');
  assert.notStrictEqual((await a.get('/trainer')).status, 423);
});

test('Веб-контрольная: во время окна практика web-2 закрыта, а само задание открыто', async (t) => {
  t.after(cleanupContentFiles);
  const now = Date.now();
  const asg = seedAssignment({
    title: WEB_TITLE,
    mdPath: 'individual/stWeb/katalog-na-xml-i-dom.md',
    targetType: 'individual',
    targetStudentId: 'stWeb',
    markdown: '# Каталог на XML и DOM',
  });
  db.setAssignmentWindow(asg.id, { opensAt: new Date(now - DAY).toISOString(), closesAt: new Date(now + DAY).toISOString() });
  const a = await login('stWeb');

  // другой предмет закрыт
  const js = await a.get('/subjects/javascript');
  assert.strictEqual(js.status, 423);
  // само задание контрольной — открыто (исключение)
  const own = await a.get(`/assignment/${asg.id}?subject=javascript`);
  assert.strictEqual(own.status, 200);
  assert.match(own.text, /Каталог на XML и DOM/);
  // карточка-вход на главной ведёт на задание
  const home = await a.get('/');
  assert.match(home.text, new RegExp(`/assignment/${asg.id}`));
});

test('Веб-контрольная: без окна у задания практика не блокируется', async (t) => {
  t.after(cleanupContentFiles);
  seedAssignment({
    title: WEB_TITLE,
    mdPath: 'individual/stWeb/katalog-na-xml-i-dom.md',
    targetType: 'individual',
    targetStudentId: 'stWeb',
    markdown: '# Каталог на XML и DOM',
  });
  const a = await login('stWeb');
  assert.notStrictEqual((await a.get('/subjects/javascript')).status, 423);
});
