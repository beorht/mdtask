const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../../src/server');
const db = require('../../src/db');
const { DEFAULT_PASSWORD } = require('../../src/lib/password');
const { seedAssignment, cleanupContentFiles } = require('../helpers/fixtures');
const { UPLOAD_DIR } = require('../../src/lib/submission-files');

const app = createApp();
const TITLE = 'Каталог на XML и DOM (двухстраничный сайт)';

async function teacher() {
  const agent = request.agent(app);
  await agent.post('/login').send({ studentId: 'teach-wc', password: DEFAULT_PASSWORD });
  return agent;
}

test.beforeEach(() => {
  db.__resetForTests();
  db.createUser({ id: 'teach-wc', role: 'teacher', name: 'Препод', group: null, mustChangePassword: false });
});

test('веб-контрольная: пустое состояние, если задание не выдано', async () => {
  const t = await teacher();
  const r = await t.get('/admin/web-control');
  assert.strictEqual(r.status, 200);
  assert.match(r.text, /Веб-контрольная/);
  assert.match(r.text, /задание ещё не выдано/i);
});

test('веб-контрольная: студент, вариант, статус и ссылки на скачивание', async (t) => {
  t.after(cleanupContentFiles);
  db.createUser({ id: 'stWeb-090', role: 'student', name: 'Веб Девять', group: 'web-2', mustChangePassword: false });
  const a = seedAssignment({
    title: TITLE,
    mdPath: 'individual/stWeb-090/katalog-na-xml-i-dom.md',
    targetType: 'individual',
    targetStudentId: 'stWeb-090',
    markdown: '# Каталог на XML и DOM',
  });
  const sub = db.createSubmission({ assignmentId: a.id, studentId: 'stWeb-090', files: ['site.zip', 'schema.xsd'], storedFiles: ['s1.zip', 's2.xsd'] });
  // реальные файлы на диске, чтобы ссылки скачивания отрисовались и all.zip собрался
  const dir = path.join(UPLOAD_DIR, a.id, 'stWeb-090');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 's1.zip'), 'PK-fake-zip');
  fs.writeFileSync(path.join(dir, 's2.xsd'), '<xs:schema/>');

  const tt = await teacher();
  const r = await tt.get('/admin/web-control');
  assert.strictEqual(r.status, 200);
  assert.match(r.text, /Веб Девять/);
  assert.match(r.text, /Рецепты|Книги|Фильм|Игр|Смартфон|Автомобил|Альбом|Велосипед|Фотоаппарат|растени|Кафе|курс|час|маршрут|команд/i); // тема варианта
  assert.match(r.text, new RegExp(`/admin/submissions/${sub.id}/files/0`));
  assert.match(r.text, new RegExp(`/admin/submissions/${sub.id}/files/1`));
  assert.match(r.text, /Скачать все работы/);

  const zip = await tt.get('/admin/web-control/all.zip').buffer();
  assert.strictEqual(zip.status, 200);
  assert.match(zip.headers['content-type'], /zip/);
  assert.ok(Number(zip.headers['content-length']) > 0, 'архив не пустой');

  // уборка загруженных файлов
  fs.rmSync(path.join(UPLOAD_DIR, a.id), { recursive: true, force: true });
});
