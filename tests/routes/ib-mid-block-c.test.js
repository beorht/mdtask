const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const blockC = require('../../src/lib/ib-mid/block-c');

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

test('ядро: эталонный вывод решает, неверный — нет; условие без кода-решения', () => {
  for (const id of blockC.IDS) {
    const t = blockC.load(id);
    const good = blockC.grade(id, t.tests.map((x) => x.output));
    assert.ok(good.solved, `${id}: эталон должен решать`);
    assert.ok(!blockC.grade(id, ['x', 'y']).solved);
    const v = blockC.view(id);
    assert.ok(v.tests.every((x) => !('output' in x)), 'эталон клиенту не отдаётся');
  }
});

test('блок C готов и ведёт на страницу задачи с редактором', async () => {
  const a = await login('st-tst');
  const page = await a.get('/exam/ib-mid-1');
  assert.match(page.text, /Программа с ошибкой №1/);
  assert.match(page.text, /\/exam\/ib-mid-1\/c1/);
  const r = await a.get('/exam/ib-mid-1/c1');
  assert.strictEqual(r.status, 200);
  assert.match(r.text, /ib-mid-bugfix\.js/);
  assert.match(r.text, /data-tests=/);
});

test('4 запуска → авто-сдача; вердикт скрыт', async () => {
  const a = await login('st-tst');
  const correct = blockC.load('c1').tests.map((x) => x.output);
  let last;
  for (let i = 1; i <= 4; i += 1) {
    last = await a.post('/exam/ib-mid-1/c1/run').send({ outputs: correct, draft: 'print(1)' });
    assert.strictEqual(last.body.runsUsed, i);
    assert.strictEqual('solved' in last.body, false, 'вердикт не должен показываться');
    assert.strictEqual('pass' in last.body, false);
  }
  assert.strictEqual(last.body.locked, true);
  const row = db.getMidTask('st-tst', 'c1');
  assert.strictEqual(row.locked, true);
  assert.strictEqual(row.status, 'done'); // эталонные выводы
  assert.strictEqual(row.runs, 4);
  // после блокировки запуск не меняет счётчик
  const after = await a.post('/exam/ib-mid-1/c1/run').send({ outputs: correct });
  assert.strictEqual(after.body.locked, true);
  assert.strictEqual(after.body.runsUsed, 4);
});

test('«Отправить» блокирует досрочно; неверные выводы → not_done', async () => {
  const a = await login('st-tst');
  const r = await a.post('/exam/ib-mid-1/c2/submit').send({ outputs: ['нет', 'нет'], draft: 'x=1' });
  assert.strictEqual(r.body.locked, true);
  const row = db.getMidTask('st-tst', 'c2');
  assert.strictEqual(row.locked, true);
  assert.strictEqual(row.status, 'not_done');
});

test('вне окна (ib-2) закрыто, чужой группе 404', async () => {
  const ib = await login('st-ib');
  assert.strictEqual((await ib.get('/exam/ib-mid-1/c1')).status, 302);
  assert.strictEqual((await ib.post('/exam/ib-mid-1/c1/run').send({ outputs: [] })).status, 423);
  db.setMidWindow(new Date(Date.now() - DAY).toISOString(), new Date(Date.now() + DAY).toISOString());
  assert.strictEqual((await ib.get('/exam/ib-mid-1/c1')).status, 200);
  const web = await login('st-web');
  assert.strictEqual((await web.get('/exam/ib-mid-1/c1')).status, 404);
});
