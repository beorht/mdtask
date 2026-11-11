const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const gen = require('../../scripts/web-dom-xml/generate');
const { lessonForAssignment } = require('../../src/lib/js-course');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const { seedAssignment, cleanupContentFiles } = require('../helpers/fixtures');
const { assignmentWindow, windowFromDate } = require('../../src/lib/assignment-window');

const app = createApp();

const DAY = 86400000;
function issueWindowed(studentId, opensAt, closesAt) {
  const v = gen.variantFor(studentId, 'Веб', studentId);
  const a = seedAssignment({
    title: 'Каталог на XML и DOM (двухстраничный сайт)',
    mdPath: `individual/${studentId}/katalog-na-xml-i-dom.md`,
    targetType: 'individual',
    targetStudentId: studentId,
    markdown: gen.statement(v),
  });
  db.setAssignmentWindow(a.id, { opensAt, closesAt });
  return { a, v };
}

test('вариант детерминирован и различается у разных студентов', () => {
  const a1 = gen.variantFor('stWeb-001');
  const a2 = gen.variantFor('stWeb-001');
  assert.deepStrictEqual(a1, a2); // один и тот же студент → тот же вариант
  const ids = Array.from({ length: 16 }, (_, i) => `stWeb-${String(i + 1).padStart(3, '0')}`);
  const sigs = new Set(ids.map((id) => {
    const v = gen.variantFor(id);
    return `${v.theme.catalog}|${v.restriction}|${v.searchField}|${v.minRecords}`;
  }));
  assert.ok(sigs.size >= 12, `ожидали много разных вариантов, получили ${sigs.size}`);
});

test('каждый вид ограничения XSD порождает корректное описание', () => {
  for (const kind of gen.RESTRICTIONS) {
    const v = { ...gen.variantFor('stWeb-001'), restriction: kind };
    const text = gen.restrictionText(v);
    assert.ok(text && text.length > 10);
    if (kind === 'range') assert.match(text, /xs:minInclusive/);
    if (kind === 'enumeration') assert.match(text, /xs:enumeration/);
    if (kind === 'pattern') assert.match(text, /xs:pattern/);
  }
});

test('текст задания: без готового кода, без слов-уровней, со всем нужным', () => {
  const v = gen.variantFor('stWeb-007', 'Тест Студент', 'stWeb-007');
  const md = gen.statement(v);
  assert.ok(!md.includes('```'), 'в задании не должно быть блоков кода');
  assert.doesNotMatch(md, /лёгк|средн(ий|яя|его) уровень|сложн(ый|ость|ого) уровень|простой уровень/i);
  assert.match(md, /schema\.xsd/);
  assert.match(md, /data\.xml/);
  assert.match(md, /DOM/);
  assert.match(md, /item\.html\?id=/); // карточка по id
  assert.match(md, /site\.zip/); // сдача архивом
  assert.match(md, new RegExp(v.theme.catalog));
  assert.match(md, /автор: stWeb-007/); // личный маркёр
});

test('текст задания: сдача двумя файлами — код архивом, схема отдельно', () => {
  const md = gen.statement(gen.variantFor('stWeb-007'));
  assert.match(md, /site\.zip/);
  assert.match(md, /schema\.xsd/);
  assert.match(md, /отдельн/i); // «отдельным файлом» / «по отдельности»
  assert.doesNotMatch(md, /schema\.xsd[^\n]*в один архив/); // схема не внутри архива
});

test('слоты: два поля загрузки, upload_types = объединение, .xsd принимается', async (t) => {
  t.after(cleanupContentFiles);
  db.__resetForTests();
  db.createUser({ id: 'stWeb-080', role: 'student', name: 'Веб', group: 'web-2', mustChangePassword: false });
  const v = gen.variantFor('stWeb-080', 'Веб', 'stWeb-080');
  const a = seedAssignment({
    title: 'Каталог на XML и DOM (двухстраничный сайт)',
    mdPath: 'individual/stWeb-080/katalog-na-xml-i-dom.md',
    targetType: 'individual',
    targetStudentId: 'stWeb-080',
    markdown: gen.statement(v),
  });
  db.setAssignmentUploadSlots(a.id, [
    { label: 'Код сайта (архив)', accept: ['.zip', '.rar'] },
    { label: 'Схема XSD (schema.xsd)', accept: ['.xsd', '.xml'] },
  ]);
  const row = db.getAssignments().find((x) => x.id === a.id);
  assert.deepStrictEqual(row.uploadTypes.sort(), ['.rar', '.xml', '.xsd', '.zip']);
  assert.strictEqual(row.uploadSlots.length, 2);

  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: 'stWeb-080', password: DEFAULT_PASSWORD });
  const page = await agent.get(`/assignment/${a.id}?subject=javascript`);
  const inputs = (page.text.match(/type="file" name="files"/g) || []).length;
  assert.strictEqual(inputs, 2, 'ожидали два отдельных поля загрузки');
  assert.match(page.text, /Код сайта/);
  assert.match(page.text, /Схема XSD/);
  assert.match(page.text, /accept="\.xsd,\.xml"/);
});

test('памятка учителю содержит тему, ограничение и маркёр', () => {
  const v = gen.variantFor('stWeb-003', 'Иван', 'stWeb-003');
  const sheet = gen.teacherSheet(v);
  assert.match(sheet, new RegExp(v.theme.catalog));
  assert.match(sheet, /автор: stWeb-003/);
});

test('индивидуальное задание привязано к уроку dom-project курса JS', () => {
  assert.strictEqual(lessonForAssignment('individual/stWeb-003/katalog-na-xml-i-dom.md'), 'dom-project');
  assert.strictEqual(lessonForAssignment('individual/stWeb-003/drugoe-zadanie.md'), null);
});

test('студент web-2 видит выданное персональное задание в предмете JavaScript', async (t) => {
  t.after(cleanupContentFiles);
  db.__resetForTests();
  db.createUser({ id: 'stWeb-050', role: 'student', name: 'Веб Студент', group: 'web-2', mustChangePassword: false });
  db.createUser({ id: 'stWeb-051', role: 'student', name: 'Другая Группа', group: 'ib-2', mustChangePassword: false });
  const v = gen.variantFor('stWeb-050', 'Веб Студент', 'stWeb-050');
  seedAssignment({
    title: 'Каталог на XML и DOM (двухстраничный сайт)',
    mdPath: 'individual/stWeb-050/katalog-na-xml-i-dom.md',
    targetType: 'individual',
    targetStudentId: 'stWeb-050',
    markdown: gen.statement(v),
  });

  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: 'stWeb-050', password: DEFAULT_PASSWORD });
  const page = await agent.get('/subjects/javascript');
  assert.strictEqual(page.status, 200);
  assert.match(page.text, /Каталог на XML и DOM/);

  // открытие самого задания: принимает архив, показывает тему варианта
  const assignment = db.getAssignments().find((a) => a.targetStudentId === 'stWeb-050');
  const view = await agent.get(`/assignment/${assignment.id}?subject=javascript`);
  assert.strictEqual(view.status, 200);
  assert.match(view.text, new RegExp(v.theme.catalog));
});

test('окно: windowFromDate даёт 09:00–14:00 (+05) и состояния before/open/after', () => {
  const w = windowFromDate('2026-11-17', 9, 14);
  assert.strictEqual(w.opensAt, '2026-11-17T04:00:00.000Z');
  assert.strictEqual(w.closesAt, '2026-11-17T09:00:00.000Z');
  const asg = { opensAt: w.opensAt, closesAt: w.closesAt };
  assert.ok(assignmentWindow(asg, Date.parse('2026-11-17T03:00:00Z')).before);
  assert.ok(assignmentWindow(asg, Date.parse('2026-11-17T06:00:00Z')).open);
  assert.ok(assignmentWindow(asg, Date.parse('2026-11-17T10:00:00Z')).after);
  // без окна — всегда открыто
  assert.strictEqual(assignmentWindow({ opensAt: null, closesAt: null }).hasWindow, false);
  assert.strictEqual(assignmentWindow({ opensAt: null, closesAt: null }).open, true);
});

test('окно: до открытия условие и загрузка скрыты', async (t) => {
  t.after(cleanupContentFiles);
  db.__resetForTests();
  db.createUser({ id: 'stWeb-070', role: 'student', name: 'Веб', group: 'web-2', mustChangePassword: false });
  const now = Date.now();
  const { v } = issueWindowed('stWeb-070', new Date(now + DAY).toISOString(), new Date(now + 2 * DAY).toISOString());
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: 'stWeb-070', password: DEFAULT_PASSWORD });
  const a = db.getAssignments().find((x) => x.targetStudentId === 'stWeb-070');
  const page = await agent.get(`/assignment/${a.id}?subject=javascript`);
  assert.strictEqual(page.status, 200);
  assert.match(page.text, /откроется/);
  assert.doesNotMatch(page.text, /id="uploadForm"/); // загрузки нет
  assert.doesNotMatch(page.text, new RegExp(v.theme.catalog)); // условие скрыто
});

test('окно: внутри окна загрузка доступна, условие видно', async (t) => {
  t.after(cleanupContentFiles);
  db.__resetForTests();
  db.createUser({ id: 'stWeb-071', role: 'student', name: 'Веб', group: 'web-2', mustChangePassword: false });
  const now = Date.now();
  const { v } = issueWindowed('stWeb-071', new Date(now - DAY).toISOString(), new Date(now + DAY).toISOString());
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: 'stWeb-071', password: DEFAULT_PASSWORD });
  const a = db.getAssignments().find((x) => x.targetStudentId === 'stWeb-071');
  const page = await agent.get(`/assignment/${a.id}?subject=javascript`);
  assert.match(page.text, /Окно сдачи открыто/);
  assert.match(page.text, /id="uploadForm"/);
  assert.match(page.text, new RegExp(v.theme.catalog));
});

test('окно: после закрытия приём закрыт, загрузка отклоняется (403)', async (t) => {
  t.after(cleanupContentFiles);
  db.__resetForTests();
  db.createUser({ id: 'stWeb-072', role: 'student', name: 'Веб', group: 'web-2', mustChangePassword: false });
  const now = Date.now();
  issueWindowed('stWeb-072', new Date(now - 2 * DAY).toISOString(), new Date(now - DAY).toISOString());
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: 'stWeb-072', password: DEFAULT_PASSWORD });
  const a = db.getAssignments().find((x) => x.targetStudentId === 'stWeb-072');
  const page = await agent.get(`/assignment/${a.id}?subject=javascript`);
  assert.match(page.text, /Приём закрыт/);
  assert.doesNotMatch(page.text, /id="uploadForm"/);
  const post = await agent.post(`/assignment/${a.id}/submit`);
  assert.strictEqual(post.status, 403);
});

test('чужая группа не видит персональное задание web-2', async (t) => {
  t.after(cleanupContentFiles);
  db.__resetForTests();
  db.createUser({ id: 'stWeb-060', role: 'student', name: 'Веб', group: 'web-2', mustChangePassword: false });
  db.createUser({ id: 'st-ib-060', role: 'student', name: 'ИБ', group: 'ib-2', mustChangePassword: false });
  const v = gen.variantFor('stWeb-060', 'Веб', 'stWeb-060');
  const a = seedAssignment({
    title: 'Каталог на XML и DOM (двухстраничный сайт)',
    mdPath: 'individual/stWeb-060/katalog-na-xml-i-dom.md',
    targetType: 'individual',
    targetStudentId: 'stWeb-060',
    markdown: gen.statement(v),
  });
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: 'st-ib-060', password: DEFAULT_PASSWORD });
  const view = await agent.get(`/assignment/${a.id}`);
  assert.strictEqual(view.status, 404);
});
