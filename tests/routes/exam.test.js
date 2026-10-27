const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const request = require('supertest');
const { createApp } = require('../../src/server');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const db = require('../../src/db');
const exam = require('../../src/lib/exam');
const { EXAM_DIR, readLog, logFile, __resetLogForTests } = require('../../src/lib/exam/log');

const DEF = exam.EXAMS['ib-final-1'];
const BASE = `/exam/${DEF.id}`;
const HOUR = 3600 * 1000;

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

// Tests run from 127.0.0.1, which is no classroom PC: the device check is off unless a test turns it on.
function setWindow(fromMs, toMs, deviceMode = 'off') {
  exam.examWindow(DEF);
  db.setExamWindow(DEF.id, new Date(Date.now() + fromMs).toISOString(), new Date(Date.now() + toMs).toISOString());
  db.setExamDeviceMode(DEF.id, deviceMode);
}

function variantOf(id) {
  return db.getExamVariant(DEF.id, id);
}

function task(id, taskId) {
  return exam.findTask(variantOf(id), taskId);
}

function runsFor(t, wrong = false) {
  return t.tests.map((x) => ({ stdout: wrong ? 'не то' : x.output, error: null, timeout: false }));
}

test.beforeEach(() => {
  db.__resetForTests();
  fs.rmSync(EXAM_DIR, { recursive: true, force: true });
  __resetLogForTests();
  db.createUser({ id: 'ib-1', role: 'student', name: 'Студент Один', group: 'ib-2', mustChangePassword: false });
  db.createUser({ id: 'ib-2', role: 'student', name: 'Студент Два', group: 'ib-2', mustChangePassword: false });
  db.createUser({ id: 'tester', role: 'student', name: 'Тестовый Студент', group: 'TEST', mustChangePassword: false });
  exam.issueVariant(DEF, 'ib-1', 0);
  exam.issueVariant(DEF, 'ib-2', 1);
  exam.issueVariant(DEF, 'tester', 4);
});

test('before the start the exam does not exist for the group; TEST sees it at any time', async () => {
  setWindow(HOUR, 2 * HOUR);
  const app = createApp();
  const ib = await loginAs(app, 'ib-1');
  assert.strictEqual((await ib.get(BASE)).status, 404);
  assert.ok(!(await ib.get('/')).text.includes(DEF.title));
  assert.strictEqual((await ib.get('/trainer')).status, 200);
  const tester = await loginAs(app, 'tester');
  const page = await tester.get(BASE);
  assert.strictEqual(page.status, 200);
  assert.match(page.text, /Разведка в Linux/);
  assert.ok((await tester.get('/')).text.includes(DEF.title));
});

test('TEST outside the exam window: no countdown (it would reload the page at zero), during it — the timer', async () => {
  setWindow(-2 * HOUR, -HOUR);
  const app = createApp();
  const tester = await loginAs(app, 'tester');
  const page = await tester.get(`${BASE}/task/3.3`);
  assert.strictEqual(page.status, 200);
  assert.match(page.text, /Пробный режим: время не ограничено/);
  assert.doesNotMatch(page.text, /data-exam-timer/);
  setWindow(-HOUR, HOUR);
  assert.match((await tester.get(`${BASE}/task/3.3`)).text, /data-exam-timer/);
});

test('while it runs: the group sees it, the IB tasks and the SQL trainer are closed; after the end they open again', async () => {
  setWindow(-HOUR, HOUR);
  const app = createApp();
  const ib = await loginAs(app, 'ib-1');
  assert.strictEqual((await ib.get(BASE)).status, 200);
  const home = await ib.get('/');
  assert.match(home.text, /Идёт сейчас/);
  assert.strictEqual((await ib.get('/trainer')).status, 423);
  assert.strictEqual((await ib.get('/subjects/sql')).status, 423);
  assert.strictEqual((await ib.post('/trainer/x/run').send({})).status, 423);
  setWindow(-2 * HOUR, -HOUR);
  assert.strictEqual((await ib.get('/trainer')).status, 200);
  const after = await ib.get(BASE);
  assert.strictEqual(after.status, 200);
  assert.match(after.text, /Контрольная завершена/);
  // TEST is never locked.
  setWindow(-HOUR, HOUR);
  const tester = await loginAs(app, 'tester');
  assert.strictEqual((await tester.get('/trainer')).status, 200);
});

test('the group\'s practical work: closed while the exam runs and while the teacher keeps it closed', async () => {
  db.createUser({ id: 'web-1', role: 'student', name: 'Другая Группа', group: 'WEB', mustChangePassword: false });
  db.createUser({ id: 'teacher', role: 'teacher', name: 'Преподаватель', mustChangePassword: false });
  setWindow(-HOUR, HOUR);
  const app = createApp();
  const ib = await loginAs(app, 'ib-1');
  for (const url of ['/subjects/python', '/subjects/javascript', '/subjects/pis', '/assignment/any', '/trainer']) {
    const res = await ib.get(url);
    assert.strictEqual(res.status, 423, url);
    assert.match(res.text, /Закрыто на время контрольной/);
  }
  assert.strictEqual((await ib.post('/assignment/any/code/draft').send({})).status, 423);
  assert.strictEqual((await ib.get(BASE)).status, 200);
  assert.match((await ib.get('/')).text, /🔒 Закрыто на время контрольной/);
  // Other groups and TEST are not touched.
  const web = await loginAs(app, 'web-1');
  assert.strictEqual((await web.get('/subjects/python')).status, 200);
  assert.strictEqual((await (await loginAs(app, 'tester')).get('/subjects/python')).status, 200);

  // After the exam the teacher's switch keeps it closed, and opens it again.
  setWindow(-2 * HOUR, -HOUR);
  const teacher = await loginAs(app, 'teacher');
  await teacher.post(`/admin/exam/${DEF.id}/lock-practice`).type('form').send({ locked: '1' });
  let res = await ib.get('/subjects/python');
  assert.strictEqual(res.status, 423);
  assert.match(res.text, /Закрыто преподавателем/);
  assert.match((await ib.get('/')).text, /🔒 Закрыто преподавателем/);
  assert.strictEqual((await web.get('/subjects/python')).status, 200);
  await teacher.post(`/admin/exam/${DEF.id}/lock-practice`).type('form').send({ locked: '0' });
  assert.strictEqual((await ib.get('/subjects/python')).status, 200);
  assert.strictEqual((await ib.get('/trainer')).status, 200);
});

test('flag answers: wrong ones count attempts, a right one is accepted and stays', async () => {
  setWindow(-HOUR, HOUR);
  const agent = await loginAs(createApp(), 'ib-1');
  const answers = exam.scenarioOf(variantOf('ib-1')).answers;
  let res = await agent.post(`${BASE}/flag/2.1`).send({ answer: '1.2.3.4' });
  assert.deepStrictEqual(res.body, { ok: false, attempts: 1 });
  res = await agent.post(`${BASE}/flag/2.1`).send({ answer: ` ${answers['2.1']} ` });
  assert.strictEqual(res.body.ok, true);
  res = await agent.post(`${BASE}/flag/2.1`).send({ answer: 'другое' });
  assert.strictEqual(res.body.already, true);
  const row = db.getExamTask(DEF.id, 'ib-1', '2.1');
  assert.ok(row.solved);
  assert.strictEqual(row.attempts, 2);
  assert.strictEqual((await agent.post(`${BASE}/flag/3.1`).send({ answer: 'x' })).status, 404);
});

test('bug program: 4 runs, the 4th locks it with its code, only that code is accepted once, the verdict is not returned', async () => {
  setWindow(-HOUR, HOUR);
  const agent = await loginAs(createApp(), 'ib-1');
  const t = task('ib-1', '3.3');
  for (let i = 1; i <= 3; i += 1) {
    const r = await agent.post(`${BASE}/task/3.3/run`).send({ code: `print(${i})`, stdin: '' });
    assert.deepStrictEqual([r.status, r.body.runsLeft, r.body.last], [200, 4 - i, false]);
  }
  const last = await agent.post(`${BASE}/task/3.3/run`).send({ code: 'final()', stdin: '' });
  assert.deepStrictEqual([last.body.runsLeft, last.body.last], [0, true]);
  assert.strictEqual((await agent.post(`${BASE}/task/3.3/run`).send({ code: 'x', stdin: '' })).status, 409);
  assert.strictEqual((await agent.post(`${BASE}/task/3.3/draft`).send({ code: 'edited' })).status, 409);
  assert.strictEqual((await agent.post(`${BASE}/task/3.3/reset`).send({})).status, 409);
  const other = await agent.post(`${BASE}/task/3.3/submit`).send({ code: 'edited', runs: runsFor(t), kind: 'runs' });
  assert.strictEqual(other.status, 409);
  const ok = await agent.post(`${BASE}/task/3.3/submit`).send({ code: 'final()', runs: runsFor(t), kind: 'runs' });
  assert.deepStrictEqual(ok.body, { submitted: true });
  const again = await agent.post(`${BASE}/task/3.3/submit`).send({ code: 'final()', runs: runsFor(t), kind: 'runs' });
  assert.strictEqual(again.status, 409);
  const row = db.getExamTask(DEF.id, 'ib-1', '3.3');
  assert.deepStrictEqual([row.solved, row.submitKind, row.runs, row.locked], [true, 'runs', 4, true]);
  const page = await agent.get(`${BASE}/task/3.3`);
  assert.match(page.text, /Задание отправлено — код только для чтения/);
  assert.ok(!page.text.includes('тестов'), 'итог проверки программы с ошибкой студенту не показывается');
});

test('bug program: a manual submission before the runs end; the page never shows the expected output of closed tests', async () => {
  setWindow(-HOUR, HOUR);
  const agent = await loginAs(createApp(), 'ib-1');
  const t = task('ib-1', '3.4');
  const page = await agent.get(`${BASE}/task/3.4`);
  assert.strictEqual(page.status, 200);
  assert.ok(page.text.includes('Запусков осталось'));
  const json = JSON.parse(page.text.match(/<script type="application\/json" id="examTests">([\s\S]*?)<\/script>/)[1]);
  assert.strictEqual(json.length, t.tests.length);
  assert.ok(json.slice(t.openTests).every((x) => !('output' in x)));
  const res = await agent.post(`${BASE}/task/3.4/submit`).send({ code: t.starter, runs: runsFor(t, true) });
  assert.deepStrictEqual(res.body, { submitted: true });
  const row = db.getExamTask(DEF.id, 'ib-1', '3.4');
  assert.deepStrictEqual([row.solved, row.submitKind, row.locked, row.result.passed], [false, 'manual', true, 0]);
});

test('algorithm: forbidden functions are refused, bug programs cannot be run in its editor', async () => {
  setWindow(-HOUR, HOUR);
  const agent = await loginAs(createApp(), 'ib-1');
  const t = task('ib-1', '3.2');
  let r = await agent.post(`${BASE}/task/3.2/check`).send({ code: 'print(sorted([1]))', runs: runsFor(t) });
  assert.strictEqual(r.body.solved, false);
  assert.match(r.body.forbidden[0], /sorted/);
  r = await agent.post(`${BASE}/task/3.2/check`).send({ code: 'n = int(input())', runs: runsFor(t) });
  assert.strictEqual(r.body.solved, true);
  assert.ok(r.body.tests.slice(t.openTests).every((x) => x.expected === undefined && x.actual === undefined));
  const bug = task('ib-1', '3.5');
  r = await agent.post(`${BASE}/task/3.2/run`).send({ code: bug.starter, stdin: '' });
  assert.strictEqual(r.status, 409);
  assert.match(r.body.error, /3\.5/);
  r = await agent.post(`${BASE}/task/3.2/run`).send({ code: 'print(1)', stdin: '' });
  assert.strictEqual(r.body.allowed, true);
});

test('SQL: run is a preview, check grades and records', async () => {
  setWindow(-HOUR, HOUR);
  const agent = await loginAs(createApp(), 'ib-1');
  const t = task('ib-1', '4.4');
  let r = await agent.post(`${BASE}/sql/4.4`).send({ sql: 'UPDATE staff SET active = 0' });
  assert.strictEqual(r.body.success, true);
  assert.strictEqual(r.body.isCorrect, undefined);
  r = await agent.post(`${BASE}/sql/4.4`).send({ sql: t.solution, check: true });
  assert.strictEqual(r.body.isCorrect, true);
  assert.ok(db.getExamTask(DEF.id, 'ib-1', '4.4').solved);
});

test('every student has a separate log file with consecutive seq; browser events are filtered', async () => {
  setWindow(-HOUR, HOUR);
  const app = createApp();
  const a = await loginAs(app, 'ib-1');
  const b = await loginAs(app, 'ib-2');
  await a.get(BASE);
  await b.get(BASE);
  await a.post(`${BASE}/flag/1.2`).send({ answer: '1' });
  await a.post(`${BASE}/log`).send({ events: [{ type: 'paste', task: '3.1', stage: 3, data: { chars: 500 } }, { type: 'evil', data: {} }] });
  const logA = readLog(DEF.id, 'ib-1');
  const logB = readLog(DEF.id, 'ib-2');
  assert.ok(fs.existsSync(logFile(DEF.id, 'ib-1')) && fs.existsSync(logFile(DEF.id, 'ib-2')));
  assert.deepStrictEqual(logA.map((e) => e.seq), logA.map((_, i) => i + 1));
  assert.ok(logA.every((e) => e.student === 'ib-1') && logB.every((e) => e.student === 'ib-2'));
  assert.deepStrictEqual(logA.map((e) => e.type), ['session_start', 'device', 'page_view', 'flag_answer', 'paste']);
  assert.strictEqual(logA[4].data.chars, 500);
  assert.strictEqual(db.getExamEvents(DEF.id, 'ib-1').length, 5);
});

test('after the end: actions are refused and logged, unsent programs and the report are sent as they are', async () => {
  setWindow(-HOUR, HOUR);
  const app = createApp();
  const agent = await loginAs(app, 'ib-1');
  await agent.post(`${BASE}/task/3.6/draft`).send({ code: 'half done' });
  await agent.post(`${BASE}/report`).send({ fields: { timeline: 'ночью' } });
  setWindow(-3 * HOUR, -HOUR);
  const r = await agent.post(`${BASE}/flag/1.1`).send({ answer: 'x' });
  assert.strictEqual(r.status, 409);
  const row = db.getExamTask(DEF.id, 'ib-1', '3.6');
  assert.deepStrictEqual([row.submitKind, row.answer, row.locked], ['timeout', 'half done', true]);
  assert.strictEqual(db.getExamTask(DEF.id, 'ib-1', '6.1').submitKind, 'timeout');
  assert.ok(readLog(DEF.id, 'ib-1').some((e) => e.type === 'blocked_action'));
});

test('scores are shown only after the teacher publishes them; admin pages, report score and CSV', async () => {
  setWindow(-3 * HOUR, -HOUR);
  const app = createApp();
  const student = await loginAs(app, 'ib-1');
  assert.ok(!/Баллов:/.test((await student.get(BASE)).text));
  const admin = await loginAs(app, 'teacher-1');
  assert.strictEqual((await admin.get(`/admin/exam/${DEF.id}`)).status, 200);
  assert.strictEqual((await admin.get(`/admin/exam/${DEF.id}/students/ib-1`)).status, 200);
  await admin.post(`/admin/exam/${DEF.id}/students/ib-1/report-score`).type('form').send({ score: '7,5' });
  assert.strictEqual(db.getExamTask(DEF.id, 'ib-1', '6.1').teacherScore, 7.5);
  await admin.post(`/admin/exam/${DEF.id}/publish`).type('form').send({ published: '1' });
  const page = await student.get(BASE);
  assert.match(page.text, /Баллов: <strong>7\.5<\/strong>/);
  const csv = await admin.get(`/admin/exam/${DEF.id}/export.csv`);
  assert.match(csv.text, /ib-1/);
  // The window is entered in local time (UTC+5).
  await admin.post(`/admin/exam/${DEF.id}/window`).type('form').send({ startsAt: '2026-11-20T09:00', endsAt: '2026-11-20T11:50' });
  const win = exam.examWindow(DEF);
  assert.deepStrictEqual([win.startsAt, win.endsAt], ['2026-11-20T04:00:00.000Z', '2026-11-20T06:50:00.000Z']);
});

test('classroom PCs only: other devices are refused and logged, a listed PC or the teacher permission lets in; the rest of the site is not checked', async () => {
  setWindow(-HOUR, HOUR, 'block');
  const app = createApp();
  const agent = await loginAs(app, 'ib-1');
  let page = await agent.get(BASE);
  assert.strictEqual(page.status, 403);
  assert.match(page.text, /Только с компьютеров аудитории/);
  assert.strictEqual((await agent.post(`${BASE}/flag/1.1`).send({ answer: 'x' })).status, 403);
  assert.strictEqual((await agent.post(`${BASE}/terminal/api/run`).send({ cmd: 'ls' })).status, 403);
  assert.strictEqual((await agent.get('/')).status, 200);
  const blocked = readLog(DEF.id, 'ib-1').filter((e) => e.type === 'device_blocked');
  assert.strictEqual(blocked.length, 3);
  assert.strictEqual(blocked[0].data.ip, '127.0.0.1');
  assert.strictEqual(blocked[0].data.reason, 'unknown');

  db.saveExamPc({ name: 'pc-414-01', ip: '127.0.0.1', mac: null, room: '414' });
  page = await agent.get(BASE);
  assert.strictEqual(page.status, 200);
  const seen = readLog(DEF.id, 'ib-1').filter((e) => e.type === 'device' || e.type === 'device_change');
  assert.strictEqual(seen[seen.length - 1].data.pc, 'pc-414-01');

  db.deleteExamPc(db.getExamPcs()[0].id);
  db.setExamAnyDevice(DEF.id, 'ib-1', true);
  assert.strictEqual((await agent.get(BASE)).status, 200);

  // Warn mode lets in; TEST is never checked.
  db.setExamAnyDevice(DEF.id, 'ib-1', false);
  db.setExamDeviceMode(DEF.id, 'warn');
  assert.strictEqual((await agent.get(BASE)).status, 200);
  db.setExamDeviceMode(DEF.id, 'block');
  const tester = await loginAs(app, 'tester');
  assert.strictEqual((await tester.get(BASE)).status, 200);

  const admin = await loginAs(app, 'teacher-1');
  const overview = await admin.get(`/admin/exam/${DEF.id}`);
  assert.match(overview.text, /✕ 3/);
  assert.strictEqual((await admin.get(`/admin/exam/${DEF.id}/pcs`)).status, 200);
  await admin.post(`/admin/exam/${DEF.id}/pcs`).type('form').send({ name: 'pc-414-17', ip: '192.168.100.20', mac: 'F4-B5-20-66-00-01', room: '414' });
  assert.deepStrictEqual(db.getExamPcs().map((p) => [p.name, p.mac]), [['pc-414-17', 'f4:b5:20:66:00:01']]);
  await admin.post(`/admin/exam/${DEF.id}/students/ib-1/any-device`).type('form').send({ allowed: '1' });
  assert.ok(db.getExamVariant(DEF.id, 'ib-1').anyDevice);
});
