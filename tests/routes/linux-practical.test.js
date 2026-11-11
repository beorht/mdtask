const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const { checkMission } = require('../../src/lib/linux-course/validate');
const P = require('../../content/linux/practical.js');

const app = createApp();

test.beforeEach(() => {
  db.__resetForTests();
  db.createUser({ id: 'st-w1', role: 'student', name: 'Веб-1', group: 'web-1', mustChangePassword: false });
  db.createUser({ id: 'st-ib', role: 'student', name: 'ИБ', group: 'ib-2', mustChangePassword: false });
});

async function login(id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

test('контент: 13 команд по 2 задания, все шаги решаются эталоном', () => {
  const cmds = {};
  P.steps.forEach((s) => { cmds[s.cmd] = (cmds[s.cmd] || 0) + 1; });
  assert.strictEqual(Object.keys(cmds).length, 13);
  Object.values(cmds).forEach((n) => assert.strictEqual(n, 2));
  assert.strictEqual(P.steps.length, 26);
  // второе задание команды не повторяет текст первого
  const byCmd = {};
  P.steps.forEach((s) => { (byCmd[s.cmd] = byCmd[s.cmd] || []).push(s.task); });
  Object.values(byCmd).forEach((tasks) => assert.notStrictEqual(tasks[0], tasks[1]));
  // команды перемешаны: одна и та же команда не идёт двумя шагами подряд
  for (let i = 1; i < P.steps.length; i += 1) {
    assert.notStrictEqual(P.steps[i].cmd, P.steps[i - 1].cmd, `команда ${P.steps[i].cmd} повторяется подряд на шаге ${i}`);
  }
  let log = [];
  P.steps.forEach((s) => {
    log = log.concat(s.solution);
    const r = checkMission({ fs: P.fs, startCwd: P.startCwd, check: s.check }, log);
    assert.ok(r.solved, `шаг ${s.id} не решается эталоном`);
    assert.ok(!('solution' in r), 'эталон клиенту не отдаётся'); // sanity
  });
});

test('web-1: карточка практической на странице предмета, по умолчанию открыта', async () => {
  const a = await login('st-w1');
  const page = await a.get('/subjects/linux');
  assert.strictEqual(page.status, 200);
  assert.match(page.text, /Практическая работа\. Терминал/);
  // страница практической открывается
  const pr = await a.get('/subjects/linux/practical');
  assert.strictEqual(pr.status, 200);
  assert.match(pr.text, /linux-practical\.js/);
});

test('web-1: шаги идут по одному, при верной команде открывается следующий (журнал общий)', async () => {
  const a = await login('st-w1');
  const me = await a.get('/subjects/linux/practical/api/me');
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.body.currentIndex, 0);
  assert.strictEqual(me.body.steps.length, P.steps.length);
  assert.ok(!('solution' in me.body.steps[0]), 'эталон не отдаётся клиенту');
  assert.ok(!('check' in me.body.steps[0]), 'правила проверки не отдаются клиенту');

  // первый шаг (whoami): неверная команда — не зачтено
  let r = await a.post('/subjects/linux/practical/api/check').send({ stepId: P.steps[0].id, log: ['pwd'] });
  assert.strictEqual(r.body.solved, false);
  // верная — зачтено, следующий индекс = 1
  r = await a.post('/subjects/linux/practical/api/check').send({ stepId: P.steps[0].id, log: ['whoami'] });
  assert.strictEqual(r.body.solved, true);
  assert.strictEqual(r.body.nextIndex, 1);

  // журнал сохраняется и накапливается: после перезагрузки currentIndex = 1, savedLog содержит whoami
  const me2 = await a.get('/subjects/linux/practical/api/me');
  assert.strictEqual(me2.body.currentIndex, 1);
  assert.deepStrictEqual(me2.body.savedLog, ['whoami']);
});

test('до времени открытия практическая закрыта (api 423, страница — заглушка)', async () => {
  db.setLinuxPracticalOpen(new Date(Date.now() + 3600000).toISOString()); // через час
  const a = await login('st-w1');
  const pr = await a.get('/subjects/linux/practical');
  assert.strictEqual(pr.status, 200);
  assert.match(pr.text, /ещё не открыта/i);
  const me = await a.get('/subjects/linux/practical/api/me');
  assert.strictEqual(me.status, 423);
  db.clearLinuxPracticalOpen();
  assert.strictEqual((await a.get('/subjects/linux/practical/api/me')).status, 200);
});

test('не-web-1 группа практическую не видит (404)', async () => {
  const a = await login('st-ib');
  assert.strictEqual((await a.get('/subjects/linux/practical')).status, 404);
});
