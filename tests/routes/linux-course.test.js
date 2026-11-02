// Предмет «Linux Terminal Trainer» (src/lib/linux-course): контент, серверная перепроверка миссий
// (повтор журнала команд движком public/js/linux-fs.js), доступ групп, порядок миссий, API.
const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const course = require('../../src/lib/linux-course');
const { checkMission } = require('../../src/lib/linux-course/validate');

const BASE = '/subjects/linux';

test.beforeEach(() => {
  db.__resetForTests();
  db.createUser({ id: 'test-1', role: 'student', name: 'Тест', group: 'TEST', mustChangePassword: false });
  db.createUser({ id: 'w1-1', role: 'student', name: 'Веб', group: 'web-1', mustChangePassword: false });
  db.createUser({ id: 'ib2-1', role: 'student', name: 'ИБ', group: 'ib-2', mustChangePassword: false });
});

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

const CORRECT = {
  'm1-1': ['pwd', 'whoami', 'clear'],
  'm1-2': ['ls Documents', 'ls Documents/Projects'],
  'm1-3': ['tree Documents'],
  'm2-1': ['cd Documents', 'cd Projects', 'cd ../..', 'cd Downloads'],
  'm2-2': ['cd Documents/Projects/Web', 'cd ../Python', 'cd /home/student/Documents/Reports'],
  'm2-3': ['cd ../../../../Downloads'],
  'm3-1': ['mkdir -p MyProject/Documents MyProject/Images MyProject/Sources'],
  'm3-2': ['rmdir Test', 'rmdir Archive/Old', 'rmdir Archive'],
  'm3-3': ['rm MyProject/Documents/notes.txt', 'rmdir MyProject/Documents', 'rm -r MyProject/Old',
    'rm MyProject/Images/photo.png', 'rmdir MyProject/Images'],
  'm4-1': ['cat Documents/notes.txt'],
  'm4-2': ['echo "Name: Student" > student.txt', 'echo "Course: Linux" >> student.txt',
    'echo "Level: Beginner" >> student.txt', 'echo "Готово" >> student.txt'],
  'm4-3': ['cp report.txt Documents/', 'cp report.txt report_backup.txt', 'cp -r Projects Backup'],
  'm4-4': ['mv Projects/main.txt Documents/', 'mv Documents/main.txt Documents/main_backup.txt',
    'mv Documents/main_backup.txt Projects/', 'mv Projects Backup/'],
  'm5-1': ['mkdir -p MyProject/Documents MyProject/Sources MyProject/Images MyProject/Archive',
    'echo "код" > MyProject/Sources/main.py', 'echo "код" > MyProject/Sources/backup.py',
    'echo "лого" > MyProject/Images/logo.png', 'echo "Отчёт" > MyProject/Documents/report.txt'],
  'm5-2': ['cp MyProject/Sources/main.py MyProject/Sources/backup.py', 'mv MyProject/logo.png MyProject/Images/',
    'mv MyProject/Documents/report.txt MyProject/Documents/report_final.txt', 'rmdir MyProject/Archive'],
};

test('5 modules; module 1 ready with 3 missions; each has fs, task, 3 hints, check rules; no difficulty words', () => {
  assert.strictEqual(course.MODULES.length, 5);
  const m1 = course.MODULES[0];
  assert.ok(m1.ready && m1.missions.length === 3);
  for (const m of course.MISSIONS) {
    assert.ok(m.fs && m.task && m.intro, m.id);
    assert.strictEqual(m.hints.length, 3, m.id);
    assert.ok(Array.isArray(m.check) && m.check.length >= 1, m.id);
  }
  const texts = course.MISSIONS.flatMap((m) => [m.title, m.intro, m.task, ...m.hints]).join('\n');
  assert.doesNotMatch(texts, /лёгк(ий|ая|ое) уров|средн(ий|яя|его) уровн|сложн(ый|ая) уровн|уровень сложности/i);
});

test('server recheck: the correct command log solves each mission; empty/wrong does not', () => {
  for (const m of course.MISSIONS) {
    assert.strictEqual(checkMission(m, CORRECT[m.id]).solved, true, m.id);
    assert.strictEqual(checkMission(m, []).solved, false, m.id);
  }
  // неверный журнал для m1-1 (не выполнил clear)
  assert.strictEqual(checkMission(course.MISSION_BY_ID.get('m1-1'), ['pwd', 'whoami']).solved, false);
});

test('access: TEST and web-1 see the subject; other groups 404', async () => {
  const app = createApp();
  const tester = await loginAs(app, 'test-1');
  assert.strictEqual((await tester.get(BASE)).status, 200);
  const w1 = await loginAs(app, 'w1-1');
  const page = await w1.get(BASE);
  assert.strictEqual(page.status, 200);
  assert.match(page.text, /Linux Terminal Trainer/);
  const ib = await loginAs(app, 'ib2-1');
  assert.strictEqual((await ib.get(BASE)).status, 404);
  assert.strictEqual((await ib.get(`${BASE}/api/m1-1/me`)).status, 404);
});

test('mission page and API: me returns the mission, check validates the log, progress persists', async () => {
  const app = createApp();
  const tester = await loginAs(app, 'test-1');
  assert.strictEqual((await tester.get(`${BASE}/mission/m1-1`)).status, 200);
  const me = await tester.get(`${BASE}/api/m1-1/me`);
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.body.title, 'Первое знакомство');
  assert.ok(me.body.fs && me.body.hints.length === 3);
  const bad = await tester.post(`${BASE}/api/m1-1/check`).send({ log: ['pwd'] });
  assert.strictEqual(bad.body.solved, false);
  const ok = await tester.post(`${BASE}/api/m1-1/check`).send({ log: CORRECT['m1-1'] });
  assert.strictEqual(ok.body.solved, true);
  // прогресс сохранён
  assert.match((await tester.get(BASE)).text, /Пройдено миссий: <strong>1/);
});

test('missions open in order for a non-TEST group', async () => {
  const app = createApp();
  const w1 = await loginAs(app, 'w1-1');
  // m1-2 ещё закрыта, пока m1-1 не решена
  assert.strictEqual((await w1.get(`${BASE}/mission/m1-2`)).headers.location, BASE);
  assert.strictEqual((await w1.post(`${BASE}/api/m1-2/check`).send({ log: CORRECT['m1-2'] })).status, 403);
  await w1.post(`${BASE}/api/m1-1/check`).send({ log: CORRECT['m1-1'] });
  assert.strictEqual((await w1.get(`${BASE}/mission/m1-2`)).status, 200);
});

test('home card: web-1 sees the Linux subject card', async () => {
  const app = createApp();
  const w1 = await loginAs(app, 'w1-1');
  assert.match((await w1.get('/')).text, /Linux Terminal Trainer/);
});
