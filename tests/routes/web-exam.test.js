const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const zlib = require('zlib');
const request = require('supertest');
const { createApp } = require('../../src/server');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const db = require('../../src/db');
const web = require('../../src/lib/web-exam');
const { EXAM_DIR, __resetLogForTests } = require('../../src/lib/exam/log');

const DEF = web.EXAMS['web-final-1'];
const BASE = `/exam/${DEF.id}`;
const HOUR = 3600 * 1000;
const FILES = { 'index.html': '<!doctype html><link rel="stylesheet" href="style.css"><h1>Каталог</h1><script src="script.js"></script>', 'style.css': 'h1 { color: red; }', 'script.js': 'console.log(1);' };

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

function setWindow(fromMs, toMs) {
  web.examWindow(DEF);
  db.setExamWindow(DEF.id, new Date(Date.now() + fromMs).toISOString(), new Date(Date.now() + toMs).toISOString());
  db.setExamDeviceMode(DEF.id, 'off');
}

// File names inside a zip (central directory).
function zipNames(buf) {
  const names = [];
  let i = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buf.readUInt16LE(i + 10);
  let p = buf.readUInt32LE(i + 16);
  for (let n = 0; n < count; n += 1) {
    const nameLen = buf.readUInt16LE(p + 28);
    const extra = buf.readUInt16LE(p + 30);
    const comment = buf.readUInt16LE(p + 32);
    names.push(buf.slice(p + 46, p + 46 + nameLen).toString('utf8'));
    p += 46 + nameLen + extra + comment;
  }
  return names;
}

function zipFile(buf, name) {
  let p = 0;
  while (p < buf.length - 4 && buf.readUInt32LE(p) === 0x04034b50) {
    const size = buf.readUInt32LE(p + 18);
    const nameLen = buf.readUInt16LE(p + 26);
    const extra = buf.readUInt16LE(p + 28);
    const n = buf.slice(p + 30, p + 30 + nameLen).toString('utf8');
    const data = buf.slice(p + 30 + nameLen + extra, p + 30 + nameLen + extra + size);
    if (n === name) return zlib.inflateRawSync(data).toString('utf8');
    p += 30 + nameLen + extra + size;
  }
  return null;
}

function binary(res, cb) {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
}

test.beforeEach(() => {
  db.__resetForTests();
  fs.rmSync(EXAM_DIR, { recursive: true, force: true });
  __resetLogForTests();
  db.createUser({ id: 'web-1', role: 'student', name: 'Веб Один', group: 'web-2', mustChangePassword: false });
  db.createUser({ id: 'web-2', role: 'student', name: 'Веб Два', group: 'web-2', mustChangePassword: false });
  db.createUser({ id: 'ib-9', role: 'student', name: 'Ибэ', group: 'IB', mustChangePassword: false });
  db.createUser({ id: 'tester', role: 'student', name: 'Тестовый', group: 'TEST', mustChangePassword: false });
  web.issueVariant(DEF, 'web-1', 0);
  web.issueVariant(DEF, 'web-2', 1);
  web.issueVariant(DEF, 'tester', 2);
});

test('variants: different themes and data, personal rules, no code in the specification', () => {
  const a = web.variantOf(db.getExamVariant(DEF.id, 'web-1'));
  const b = web.variantOf(db.getExamVariant(DEF.id, 'web-2'));
  assert.notStrictEqual(a.theme, b.theme);
  assert.strictEqual(a.data.length, 8);
  assert.ok(a.data.some((d) => d.number > a.threshold) && a.data.some((d) => d.number <= a.threshold));
  assert.ok(a.minValue < Math.min(...a.data.map((d) => d.number)) && a.maxValue > Math.max(...a.data.map((d) => d.number)));
  const reqs = web.requirementsOf(a);
  assert.strictEqual(reqs.length, 10);
  for (const r of reqs) assert.doesNotMatch(r.text, /[{}]|=>|function\b|<\w+[ >]/, `в требовании ${r.id} код`);
  assert.ok(reqs.some((r) => r.text.includes(a.storageKey)));
  assert.match(reqs[0].text, /одностраничное приложение/);
  for (const h of ['#list', '#add', '#favorites']) assert.ok(reqs[0].text.includes(h), h);
});

test('before the start: 404 for the group; TEST sees it; the IB exam route still works for other ids', async () => {
  setWindow(HOUR, 2 * HOUR);
  const app = createApp();
  const s = await loginAs(app, 'web-1');
  assert.strictEqual((await s.get(BASE)).status, 404);
  const t = await loginAs(app, 'tester');
  const page = await t.get(BASE);
  assert.strictEqual(page.status, 200);
  assert.match(page.text, /Техническое задание/);
  assert.match(page.text, /data-file="script\.js"/);
  assert.strictEqual((await s.get('/exam/ib-final-1')).status, 404);
});

test('while it runs: autosave keeps the files, a snapshot per minute and on «Сохранить», practice is locked', async () => {
  setWindow(-HOUR, HOUR);
  const app = createApp();
  const s = await loginAs(app, 'web-1');
  const page = await s.get(BASE);
  assert.strictEqual(page.status, 200);
  const v = web.variantOf(db.getExamVariant(DEF.id, 'web-1'));
  assert.ok(page.text.includes(v.storageKey));
  assert.ok(page.text.includes(v.data[0].name));
  let res = await s.post(`${BASE}/save`).send({ files: FILES });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.snapshot, true);
  res = await s.post(`${BASE}/save`).send({ files: { ...FILES, 'script.js': 'console.log(2);' } });
  assert.strictEqual(res.body.snapshot, false, 'автосохранение раньше минуты — без снимка');
  res = await s.post(`${BASE}/save`).send({ files: { ...FILES, 'script.js': 'console.log(3);' }, manual: true });
  assert.strictEqual(res.body.snapshot, true);
  assert.strictEqual(web.listSnapshots(DEF.id, 'web-1').length, 2);
  assert.strictEqual(web.filesOf(db.getExamTask(DEF.id, 'web-1', 'app'))['script.js'], 'console.log(3);');
  assert.strictEqual((await s.post(`${BASE}/save`).send({ files: { 'index.html': 1 } })).status, 400);
  await s.post(`${BASE}/log`).send({ events: [{ type: 'paste_blocked', data: { chars: 300 } }, { type: 'hack' }] });
  assert.ok(db.getExamEvents(DEF.id, 'web-1').some((e) => e.type === 'paste_blocked'));
  assert.ok(!db.getExamEvents(DEF.id, 'web-1').some((e) => e.type === 'hack'));
  // Practice of the WEB group is closed; the IB group is not affected.
  assert.strictEqual((await s.get('/trainer')).status, 423);
  const ib = await loginAs(app, 'ib-9');
  assert.strictEqual((await ib.get('/trainer')).status, 200);
  const home = await s.get('/');
  assert.match(home.text, /Веб-приложение по техническому заданию|Итоговая контрольная/);
});

test('after the end (and the grace) saving is refused, the page is read-only', async () => {
  setWindow(-2 * HOUR, -HOUR);
  const app = createApp();
  const s = await loginAs(app, 'web-1');
  const res = await s.post(`${BASE}/save`).send({ files: FILES });
  assert.strictEqual(res.status, 409);
  const page = await s.get(BASE);
  assert.strictEqual(page.status, 200);
  assert.match(page.text, /код только для чтения/);
  assert.strictEqual((await s.get('/trainer')).status, 200);
});

test('admin: grade by requirements, results shown after publishing, zip of one student and of all', async () => {
  setWindow(-HOUR, HOUR);
  const app = createApp();
  const s = await loginAs(app, 'web-1');
  await s.post(`${BASE}/save`).send({ files: FILES, manual: true });
  const teacher = await loginAs(app, 'teacher-1');
  const list = await teacher.get(`/admin/web-exam/${DEF.id}`);
  assert.strictEqual(list.status, 200);
  assert.match(list.text, /students\/web-1"/);
  const detail = await teacher.get(`/admin/web-exam/${DEF.id}/students/web-1`);
  assert.strictEqual(detail.status, 200);
  assert.match(detail.text, /Оценка по требованиям/);
  assert.match(detail.text, /data-frame/);
  const marks = { m1: '10', m2: '10', m3: '10', m4: '5', m5: '10', m6: '10', m7: '10', m8: '5', m9: '10', m10: '10', comment: 'Хорошо' };
  await teacher.post(`/admin/web-exam/${DEF.id}/students/web-1/grade`).type('form').send(marks);
  const g = web.gradeState(db.getExamTask(DEF.id, 'web-1', 'app'));
  assert.deepStrictEqual([g.total, g.grade, g.comment], [90, 5, 'Хорошо']);
  assert.strictEqual((await teacher.post(`/admin/web-exam/${DEF.id}/students/web-1/grade`).type('form').send({ m1: '7' })).status, 302);
  assert.strictEqual(web.gradeState(db.getExamTask(DEF.id, 'web-1', 'app')).total, 90, '7 баллов не принимаются');
  assert.doesNotMatch((await s.get(BASE)).text, /Результат: 90/);
  await teacher.post(`/admin/web-exam/${DEF.id}/publish`).type('form').send({ published: '1' });
  assert.match((await s.get(BASE)).text, /Результат: 90 из 100, оценка 5/);

  const one = await teacher.get(`/admin/web-exam/${DEF.id}/students/web-1/files.zip`).buffer(true).parse(binary);
  assert.strictEqual(one.status, 200);
  assert.match(one.headers['content-type'], /zip/);
  const names = zipNames(one.body);
  for (const f of ['index.html', 'style.css', 'script.js', 'README.txt', 'log.jsonl']) assert.ok(names.includes(f), f);
  assert.ok(names.some((n) => /^snapshots\/\d{5}-app\/script\.js$/.test(n)));
  assert.strictEqual(zipFile(one.body, 'style.css'), FILES['style.css']);
  const all = await teacher.get(`/admin/web-exam/${DEF.id}/all.zip`).buffer(true).parse(binary);
  const allNames = zipNames(all.body);
  assert.ok(allNames.some((n) => n.startsWith('web-1_') && n.endsWith('/index.html')));
  assert.ok(allNames.some((n) => n.startsWith('web-2_') && n.endsWith('/README.txt')));
});

test('the preview runner and the editor modes are served by the site (no internet)', async () => {
  const app = createApp();
  for (const url of ['/js/web-runner.js', '/js/web-exam.js', '/vendor/codemirror/5.65.16/mode/htmlmixed/htmlmixed.min.js',
    '/vendor/codemirror/5.65.16/mode/javascript/javascript.min.js', '/vendor/codemirror/5.65.16/mode/css/css.min.js',
    '/vendor/codemirror/5.65.16/mode/xml/xml.min.js']) {
    assert.strictEqual((await request(app).head(url)).status, 200, url);
  }
  // Single-page apps: «#…» links must stay inside the preview (srcdoc's base URL is the parent page otherwise).
  assert.match(fs.readFileSync('public/js/web-runner.js', 'utf8'), /<base href="about:srcdoc">/);
  // The preview never gets the site's origin: no allow-same-origin in any sandbox.
  for (const f of ['src/views/web-exam/index.ejs', 'src/views/admin/web-exam-student.ejs']) {
    const text = fs.readFileSync(f, 'utf8');
    assert.match(text, /sandbox="allow-scripts allow-forms allow-modals"/);
    assert.doesNotMatch(text, /allow-same-origin/);
  }
});
