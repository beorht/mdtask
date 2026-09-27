const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../../src/server');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const db = require('../../src/db');
const { seedAssignment, cleanupContentFiles, CONTENT_DIR } = require('../helpers/fixtures');
const { buildZip } = require('../helpers/zip');

const SUMMARY_PATH = path.join(__dirname, '..', '..', 'content', 'SUMMARY.md');
const { UPLOAD_DIR } = require('../../src/lib/submission-files');

async function loginAs(app, id) {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: id, password: DEFAULT_PASSWORD });
  return agent;
}

const createdAssignmentIds = [];
function assignment(opts) {
  const a = seedAssignment({ mdPath: `test-admin/${Math.random().toString(36).slice(2)}.md`, markdown: '# Условие\n\nТекст.', ...opts });
  createdAssignmentIds.push(a.id);
  return a;
}

function submit(assignmentId, studentId, files = ['solution.zip']) {
  return db.createSubmission({ assignmentId, studentId, files });
}

test.beforeEach(() => db.__resetForTests());
test.after(() => {
  cleanupContentFiles();
  fs.rmSync(path.join(CONTENT_DIR, 'test-admin'), { recursive: true, force: true });
  createdAssignmentIds.forEach((id) => fs.rmSync(path.join(UPLOAD_DIR, id), { recursive: true, force: true }));
});

// --- access ---

test('admin panel requires login and the teacher role', async () => {
  const app = createApp();
  const anon = await request(app).get('/admin');
  assert.strictEqual(anon.status, 302);
  assert.strictEqual(anon.headers.location, '/login');

  const student = await loginAs(app, 'student-1');
  assert.strictEqual((await student.get('/admin')).status, 403);
  assert.strictEqual((await student.get('/admin/submissions')).status, 403);

  const teacher = await loginAs(app, 'teacher-1');
  const res = await teacher.get('/admin');
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /Требуют проверки/);
});

test('every admin screen renders for a teacher', async () => {
  const a = assignment({ title: 'Экранное задание' });
  const s = submit(a.id, 'student-1');
  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');
  const pages = [
    '/admin',
    '/admin/submissions',
    '/admin/submissions?tab=review',
    `/admin/submissions/${s.id}`,
    '/admin/assignments',
    '/admin/assignments/new',
    `/admin/assignments/${a.id}`,
    `/admin/assignments/${a.id}/edit`,
    '/admin/students',
    '/admin/students/student-1',
    '/admin/courses',
    '/admin/courses/course-1',
    '/admin/trainer',
    '/admin/settings',
    '/admin/search?q=Иван',
  ];
  for (const url of pages) {
    const res = await teacher.get(url);
    assert.strictEqual(res.status, 200, `${url} -> ${res.status}`);
  }
});

test('unknown admin pages get the admin 404 page', async () => {
  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');
  const res = await teacher.get('/admin/nope');
  assert.strictEqual(res.status, 404);
  assert.match(res.text, /Страница не найдена/);
  assert.strictEqual((await teacher.get('/admin/submissions/missing')).status, 404);
});

// --- dashboard ---

test('dashboard counts pending work and shows the review queue', async () => {
  const a = assignment({ title: 'SQL JOIN' });
  submit(a.id, 'student-1');
  submit(a.id, 'student-2');
  const done = submit(assignment({ title: 'Уже проверено' }).id, 'student-3');
  db.reviewSubmission(done.id, 'done', '', 'teacher-1');

  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');
  const res = await teacher.get('/admin');
  assert.match(res.text, /class="a-stat-value">2<\/span>\s*<span class="a-stat-label">На проверке/);
  assert.match(res.text, /SQL JOIN/);
  assert.doesNotMatch(res.text, /Уже проверено/);
});

test('dashboard shows an empty state when nothing needs review', async () => {
  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');
  const res = await teacher.get('/admin');
  assert.match(res.text, /Нет работ для проверки/);
});

test('overdue counts assigned students who never submitted after the deadline', async () => {
  const a = assignment({ title: 'Просроченное', dueDate: '2000-01-01', targetType: 'group' });
  submit(a.id, 'student-1');
  const students = db.getUsers().filter((u) => u.role === 'student').length;

  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');
  const res = await teacher.get('/admin');
  const expected = students - 1;
  assert.match(res.text, new RegExp(`class="a-stat-value">${expected}</span>\\s*<span class="a-stat-label">Просрочено`));

  const profile = await teacher.get('/admin/students/student-2');
  assert.match(profile.text, /Просрочено/);
});

// --- submissions list ---

test('works list filters by tab, student search and group', async () => {
  const a = assignment({ title: 'Функции' });
  submit(a.id, 'student-1'); // IT-21, pending
  const checked = submit(a.id, 'student-5'); // IT-22
  db.reviewSubmission(checked.id, 'done', '', 'teacher-1');

  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');

  const review = await teacher.get('/admin/submissions?tab=review');
  assert.match(review.text, /Иван Иванов/);
  assert.doesNotMatch(review.text, /Дмитрий Новиков/);

  const checkedTab = await teacher.get('/admin/submissions?tab=checked');
  assert.match(checkedTab.text, /Дмитрий Новиков/);
  assert.doesNotMatch(checkedTab.text, /Иван Иванов<\/span><\/td>/);

  const byGroup = await teacher.get('/admin/submissions?group=IT-22');
  assert.match(byGroup.text, /Дмитрий Новиков/);
  assert.doesNotMatch(byGroup.text, /Иван Иванов<\/span><\/td>/);

  const byName = await teacher.get(`/admin/submissions?q=${encodeURIComponent('иван')}`);
  assert.match(byName.text, /Иван Иванов/);
  assert.doesNotMatch(byName.text, /Дмитрий Новиков/);

  const nothing = await teacher.get('/admin/submissions?q=zzzz');
  assert.match(nothing.text, /Ничего не найдено/);
});

test('the works list shows only the newest attempt of a resubmission chain', async () => {
  const a = assignment({ title: 'Цепочка' });
  const first = submit(a.id, 'student-1', ['v1.zip']);
  db.reviewSubmission(first.id, 'not_done', 'Переделать', 'teacher-1');
  const second = db.createSubmission({ assignmentId: a.id, studentId: 'student-1', files: ['v2.zip'], parentSubmissionId: first.id });

  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');
  const res = await teacher.get('/admin/submissions');
  assert.match(res.text, new RegExp(`/admin/submissions/${second.id}`));
  assert.doesNotMatch(res.text, new RegExp(`data-href="/admin/submissions/${first.id}"`));
  assert.match(res.text, /Пересдача/);
});

// --- review ---

test('saving a verdict records it and moves to the next work in the queue', async () => {
  const a = assignment({ title: 'Очередь' });
  const s1 = submit(a.id, 'student-1');
  const s2 = submit(a.id, 'student-2');

  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');
  const res = await teacher.post(`/admin/submissions/${s1.id}/review`).send({ verdict: 'done', comment: 'Отлично', next: '1' });
  assert.strictEqual(res.status, 302);
  assert.strictEqual(res.headers.location, `/admin/submissions/${s2.id}`);

  const saved = db.getSubmissionById(s1.id);
  assert.strictEqual(saved.status, 'done');
  assert.strictEqual(saved.comment, 'Отлично');
  assert.strictEqual(saved.checkedBy, 'teacher-1');

  const last = await teacher.post(`/admin/submissions/${s2.id}/review`).send({ verdict: 'not_done', next: '1' });
  assert.strictEqual(last.headers.location, '/admin/submissions?tab=review');
  const flash = await teacher.get('/admin/submissions?tab=review');
  assert.match(flash.text, /Все работы проверены/);
});

test('saving without "next" stays on the same work', async () => {
  const a = assignment({ title: 'Остаться' });
  const s1 = submit(a.id, 'student-1');
  submit(a.id, 'student-2');
  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');
  const res = await teacher.post(`/admin/submissions/${s1.id}/review`).send({ verdict: 'done', next: '0' });
  assert.strictEqual(res.headers.location, `/admin/submissions/${s1.id}`);
});

test('an unknown verdict is rejected without changing the submission', async () => {
  const s = submit(assignment({ title: 'X' }).id, 'student-1');
  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');
  await teacher.post(`/admin/submissions/${s.id}/review`).send({ verdict: 'hacked' });
  assert.strictEqual(db.getSubmissionById(s.id).status, 'pending');
});

test('"На пересдачу" lets the student upload a new attempt even after the deadline', async () => {
  const a = assignment({ title: 'Пересдача после дедлайна', dueDate: '2000-01-01' });
  const s = submit(a.id, 'student-1', ['v1.zip']);
  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');
  await teacher.post(`/admin/submissions/${s.id}/review`).send({ verdict: 'resubmit', comment: 'Исправьте ошибки' });

  const reviewed = db.getSubmissionById(s.id);
  assert.strictEqual(reviewed.status, 'not_done');
  assert.strictEqual(reviewed.resubmitAllowed, true);

  const student = await loginAs(app, 'student-1');
  const upload = await student.post(`/assignment/${a.id}/submit`).attach('files', Buffer.from('PK'), 'v2.zip');
  assert.strictEqual(upload.status, 302);
  const chain = db.getSubmissions().filter((x) => x.assignmentId === a.id);
  assert.strictEqual(chain.length, 2);
  assert.strictEqual(chain.find((x) => x.id !== s.id).parentSubmissionId, s.id);
});

test('a plain "Не выполнено" past the deadline does not reopen uploads', async () => {
  const a = assignment({ title: 'Закрыто', dueDate: '2000-01-01' });
  const s = submit(a.id, 'student-1');
  db.reviewSubmission(s.id, 'not_done', '', 'teacher-1');
  const app = createApp();
  const student = await loginAs(app, 'student-1');
  const upload = await student.post(`/assignment/${a.id}/submit`).attach('files', Buffer.from('PK'), 'v2.zip');
  assert.strictEqual(upload.status, 403);
});

test('review page lists archive contents and previews source code', async () => {
  const a = assignment({ title: 'Код в архиве' });
  const app = createApp();
  const student = await loginAs(app, 'student-1');
  const zip = buildZip({ 'solution/main.py': 'def hello():\n    return "мир"\n', 'solution/logo.png': 'x' });
  await student.post(`/assignment/${a.id}/submit`).attach('files', zip, 'work.zip');
  const s = db.getSubmissions().find((x) => x.assignmentId === a.id);

  const teacher = await loginAs(app, 'teacher-1');
  const res = await teacher.get(`/admin/submissions/${s.id}`);
  assert.strictEqual(res.status, 200);
  assert.match(res.text, /solution\/main\.py/);
  assert.match(res.text, /solution\/logo\.png/);
  assert.match(res.text, /hljs-keyword">def/); // first readable file auto-opened, highlighted
  assert.match(res.text, /мир/);

  const download = await teacher.get(`/admin/submissions/${s.id}/files/0`);
  assert.strictEqual(download.status, 200);
  assert.match(download.headers['content-disposition'], /work\.zip/);

  const binary = await teacher.get(`/admin/submissions/${s.id}?file=0&entry=1`);
  assert.match(binary.text, /Не удалось показать файл/);
});

// --- assignments ---

test('creating an assignment from the admin panel writes content, SUMMARY and the DB row', async () => {
  const summaryBefore = fs.readFileSync(SUMMARY_PATH, 'utf-8');
  let created;
  try {
    const app = createApp();
    const teacher = await loginAs(app, 'teacher-1');
    const res = await teacher.post('/admin/assignments').send({
      courseId: 'course-1',
      title: 'Админ задание',
      targetType: 'group',
      targetGroup: 'IT-22',
      sectionTitle: 'Тестовый раздел админки',
      dueDate: '2030-01-01',
      markdown: '# Админ задание\n\nСвоё условие.',
    });
    assert.strictEqual(res.status, 302);
    created = db.getAssignments().find((x) => x.title === 'Админ задание');
    assert.ok(created);
    assert.strictEqual(created.targetGroup, 'IT-22');
    assert.strictEqual(res.headers.location, `/admin/assignments/${created.id}`);
    assert.strictEqual(fs.readFileSync(path.join(CONTENT_DIR, created.mdPath), 'utf-8'), '# Админ задание\n\nСвоё условие.');
    assert.match(fs.readFileSync(SUMMARY_PATH, 'utf-8'), /\[Админ задание\]/);
  } finally {
    fs.writeFileSync(SUMMARY_PATH, summaryBefore, 'utf-8');
    if (created) fs.rmSync(path.join(CONTENT_DIR, path.dirname(created.mdPath)), { recursive: true, force: true });
  }
});

test('creating an assignment with missing fields re-renders the form with an error', async () => {
  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');
  const res = await teacher.post('/admin/assignments').send({ courseId: 'course-1', title: '', targetType: 'group' });
  assert.strictEqual(res.status, 400);
  assert.match(res.text, /Заполните все обязательные поля/);
});

test('editing an assignment updates its text, title, deadline and SUMMARY entry', async () => {
  const summaryBefore = fs.readFileSync(SUMMARY_PATH, 'utf-8');
  const a = assignment({ title: 'Старое название' });
  fs.writeFileSync(SUMMARY_PATH, `${summaryBefore.trimEnd()}\n- [Тест]()\n  - [Старое название](${a.mdPath})\n`, 'utf-8');
  try {
    const app = createApp();
    const teacher = await loginAs(app, 'teacher-1');
    const res = await teacher
      .post(`/admin/assignments/${a.id}/edit`)
      .send({ title: 'Новое название', dueDate: '2031-05-05', markdown: '# Новое\n\nОбновлено.' });
    assert.strictEqual(res.status, 302);

    const updated = db.getAssignments().find((x) => x.id === a.id);
    assert.strictEqual(updated.title, 'Новое название');
    assert.strictEqual(updated.dueDate, '2031-05-05');
    assert.strictEqual(fs.readFileSync(path.join(CONTENT_DIR, a.mdPath), 'utf-8'), '# Новое\n\nОбновлено.');
    const summary = fs.readFileSync(SUMMARY_PATH, 'utf-8');
    assert.match(summary, new RegExp(`\\[Новое название\\]\\(${a.mdPath.replace(/[.]/g, '\\.')}\\)`));
    assert.doesNotMatch(summary, /Старое название/);
  } finally {
    fs.writeFileSync(SUMMARY_PATH, summaryBefore, 'utf-8');
  }
});

test('assignment detail lists every assigned student with their status', async () => {
  const a = assignment({ title: 'Группа IT-22', targetGroup: 'IT-22' });
  const s = submit(a.id, 'student-5');
  db.reviewSubmission(s.id, 'done', '', 'teacher-1');
  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');
  const res = await teacher.get(`/admin/assignments/${a.id}`);
  assert.match(res.text, /Дмитрий Новиков/);
  assert.match(res.text, /Выполнено/);
});

// --- search ---

test('global search JSON finds students, assignments and works', async () => {
  const a = assignment({ title: 'Словари Python' });
  submit(a.id, 'student-2');
  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');

  const byStudent = await teacher.get(`/admin/search?format=json&q=${encodeURIComponent('Мария')}`);
  assert.strictEqual(byStudent.status, 200);
  assert.strictEqual(byStudent.body.students[0].url, '/admin/students/student-2');
  assert.ok(byStudent.body.works.some((w) => /Словари Python/.test(w.title)));

  const byAssignment = await teacher.get(`/admin/search?format=json&q=${encodeURIComponent('словари')}`);
  assert.ok(byAssignment.body.assignments.some((x) => x.url === `/admin/assignments/${a.id}`));
});

test('teacher login lands in the admin panel', async () => {
  const app = createApp();
  const res = await request(app).post('/login').send({ studentId: 'teacher-1', password: DEFAULT_PASSWORD });
  assert.strictEqual(res.headers.location, '/admin');
});

// --- migrated from the removed classic /teacher suites ---

function withSummaryRestore(fn) {
  return async () => {
    const summaryBefore = fs.readFileSync(SUMMARY_PATH, 'utf-8');
    const createdPaths = [];
    try {
      await fn(createdPaths);
    } finally {
      fs.writeFileSync(SUMMARY_PATH, summaryBefore, 'utf-8');
      createdPaths.forEach((p) => fs.rmSync(path.join(CONTENT_DIR, p), { force: true }));
    }
  };
}

test(
  'creating an individual assignment scopes it to the chosen student only',
  withSummaryRestore(async (createdPaths) => {
    const app = createApp();
    const teacher = await loginAs(app, 'teacher-1');
    const res = await teacher.post('/admin/assignments').send({
      courseId: 'course-1',
      title: 'Персональное задание',
      targetType: 'individual',
      targetStudentId: 'student-2',
      dueDate: '2030-01-01',
    });
    assert.strictEqual(res.status, 302);
    const created = db.getAssignments().find((a) => a.title === 'Персональное задание');
    createdPaths.push(created.mdPath);
    assert.strictEqual(created.targetType, 'individual');
    assert.strictEqual(created.targetStudentId, 'student-2');
    assert.strictEqual(created.mdPath, 'individual/student-2/personalnoe-zadanie.md');
    assert.match(fs.readFileSync(SUMMARY_PATH, 'utf-8'), /Мои доп\. задания[\s\S]*Персональное задание/);

    assert.match((await (await loginAs(app, 'student-2')).get('/')).text, /Персональное задание/);
    assert.doesNotMatch((await (await loginAs(app, 'student-1')).get('/')).text, /Персональное задание/);
  })
);

test(
  'a group-targeted assignment is visible only to that group; an empty group means all groups',
  withSummaryRestore(async (createdPaths) => {
    const app = createApp();
    const teacher = await loginAs(app, 'teacher-1');
    const base = { courseId: 'course-1', targetType: 'group', sectionTitle: 'Тестовый раздел админки', dueDate: '2030-01-01' };
    await teacher.post('/admin/assignments').send({ ...base, title: 'Только IT-21', targetGroup: 'IT-21' });
    await teacher.post('/admin/assignments').send({ ...base, title: 'Для всех групп' });
    db.getAssignments().forEach((a) => createdPaths.push(a.mdPath));

    const it21 = await (await loginAs(app, 'student-1')).get('/');
    const it22 = await (await loginAs(app, 'student-5')).get('/');
    assert.match(it21.text, /Только IT-21/);
    assert.doesNotMatch(it22.text, /Только IT-21/);
    assert.match(it21.text, /Для всех групп/);
    assert.match(it22.text, /Для всех групп/);
  })
);

test('a rejected create form leaves SUMMARY.md untouched', async () => {
  const summaryBefore = fs.readFileSync(SUMMARY_PATH, 'utf-8');
  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');
  await teacher.post('/admin/assignments').send({ courseId: 'course-1', title: '', targetType: 'group' });
  assert.strictEqual(fs.readFileSync(SUMMARY_PATH, 'utf-8'), summaryBefore);
});

test('students cannot create, edit or preview assignments', async () => {
  const a = assignment({ title: 'Чужое' });
  const app = createApp();
  const student = await loginAs(app, 'student-1');
  const create = await student.post('/admin/assignments').send({ courseId: 'course-1', title: 'Hack', targetType: 'group', sectionTitle: 'X', dueDate: '2030-01-01' });
  assert.strictEqual(create.status, 403);
  const edit = await student.post(`/admin/assignments/${a.id}/edit`).send({ title: 'Hacked', dueDate: '2030-01-01', markdown: '# x' });
  assert.strictEqual(edit.status, 403);
  assert.strictEqual(db.getAssignments().find((x) => x.id === a.id).title, 'Чужое');
  assert.strictEqual((await student.post('/api/preview').send({ markdown: '# x' })).status, 403);
});

test('markdown preview API renders html for the editor', async () => {
  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');
  const res = await teacher.post('/api/preview').send({ markdown: '# Привет' });
  assert.strictEqual(res.status, 200);
  assert.match(res.body.html, /<h1 id="[^"]*">Привет<\/h1>/);
});

test('file download: original name, out-of-range index and student access', async () => {
  const a = assignment({ title: 'Скачивание' });
  const app = createApp();
  const student = await loginAs(app, 'student-1');
  await student.post(`/assignment/${a.id}/submit`).attach('files', Buffer.from('archive contents'), 'homework.zip');
  const s = db.getLatestSubmission(a.id, 'student-1');

  const teacher = await loginAs(app, 'teacher-1');
  const ok = await teacher.get(`/admin/submissions/${s.id}/files/0`);
  assert.strictEqual(ok.status, 200);
  assert.match(ok.headers['content-disposition'], /homework\.zip/);
  assert.strictEqual(ok.text, 'archive contents');

  assert.strictEqual((await teacher.get(`/admin/submissions/${s.id}/files/99`)).status, 404);
  assert.strictEqual((await student.get(`/admin/submissions/${s.id}/files/0`)).status, 403);
});

test('old /teacher URLs redirect to their admin-panel equivalents', async () => {
  const app = createApp();
  const teacher = await loginAs(app, 'teacher-1');
  const cases = [
    ['/teacher', '/admin'],
    ['/teacher/courses/course-1/assignments/new', '/admin/assignments/new?course=course-1'],
    ['/teacher/assignment/assign-9/edit', '/admin/assignments/assign-9/edit'],
    ['/teacher/assignment/assign-9/submissions', '/admin/assignments/assign-9'],
    ['/teacher/assignment/assign-9/submissions/sub-3/files/0', '/admin/submissions/sub-3/files/0'],
    ['/teacher/trainer/results', '/admin/trainer/results'],
    ['/teacher/trainer/results/student-1/ex-1', '/admin/trainer/student-1/ex-1'],
    ['/', '/admin'],
  ];
  for (const [from, to] of cases) {
    const res = await teacher.get(from);
    assert.strictEqual(res.status, 302, from);
    assert.strictEqual(res.headers.location, to, from);
  }
  const student = await loginAs(app, 'student-1');
  assert.strictEqual((await student.get('/teacher')).status, 403);
});
