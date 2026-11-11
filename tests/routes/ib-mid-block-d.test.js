const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const blockD = require('../../src/lib/ib-mid/block-d');

const app = createApp();
const DAY = 86400000;

test.beforeEach(() => {
  db.__resetForTests();
  db.createUser({ id: 'st-tst', role: 'student', name: 'Тест', group: 'TEST', mustChangePassword: false });
  db.createUser({ id: 'st-ib', role: 'student', name: 'ИБ', group: 'ib-2', mustChangePassword: false });
  db.createUser({ id: 'st-web', role: 'student', name: 'Веб', group: 'web-1', mustChangePassword: false });
});

async function login(id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

test('ядро: эталон засчитывается, хардкод первого набора проваливает второй', () => {
  for (const id of ['d1-logins', 'd2-secrets']) {
    const d = blockD.datasetsFor('st-ib-5', id);
    assert.ok(blockD.check('st-ib-5', id, d.expected).solved);
    assert.ok(!blockD.check('st-ib-5', id, ['x', 'y']).solved);
    if (d.expected[0] !== d.expected[1]) {
      assert.ok(!blockD.check('st-ib-5', id, [d.expected[0], d.expected[0]]).solved);
    }
    const v = blockD.view('st-ib-5', id);
    assert.strictEqual(v.datafile, 'data.log');
    assert.strictEqual(v.datasets.length, 2);
  }
});

test('блок D готов, страница задачи с файлом data.log', async () => {
  const a = await login('st-tst');
  const page = await a.get('/exam/ib-mid-1');
  assert.match(page.text, /Нежелательные входы/);
  assert.match(page.text, /Утечки паролей/);
  const r = await a.get('/exam/ib-mid-1/d1-logins');
  assert.strictEqual(r.status, 200);
  assert.match(r.text, /data-datafile="data\.log"/);
  assert.match(r.text, /ib-mid-python\.js/);
});

test('проверка правильного вывода засчитывает задачу (status done)', async () => {
  const a = await login('st-tst');
  const d = blockD.datasetsFor('st-tst', 'd2-secrets');
  const r = await a.post('/exam/ib-mid-1/d2-secrets/check').send({ outputs: d.expected });
  assert.strictEqual(r.body.solved, true);
  assert.strictEqual(db.getMidTask('st-tst', 'd2-secrets').status, 'done');
});

test('вне окна (ib-2) закрыто, чужой группе 404', async () => {
  const ib = await login('st-ib');
  assert.strictEqual((await ib.get('/exam/ib-mid-1/d1-logins')).status, 302);
  db.setMidWindow(new Date(Date.now() - DAY).toISOString(), new Date(Date.now() + DAY).toISOString());
  assert.strictEqual((await ib.get('/exam/ib-mid-1/d1-logins')).status, 200);
  const web = await login('st-web');
  assert.strictEqual((await web.get('/exam/ib-mid-1/d1-logins')).status, 404);
});
