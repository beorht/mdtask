#!/usr/bin/env node
// Группа WEB: раздел «DOM: подробная теория» (8 частей, content/src/section-dom-podrobnaya-teoriya/).
// Добавляет раздел в content/SUMMARY.md и задания в базу — только то, чего ещё нет,
// поэтому скрипт можно запускать повторно. Файлы .md должны уже лежать в папке раздела.
//
//   node scripts/web/add-dom-theory.js            — только показать, что будет сделано
//   node scripts/web/add-dom-theory.js --apply    — выполнить (перед этим — копия базы в backups/)
// База — DB_PATH (data/mdtask.db).
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const APPLY = process.argv.includes('--apply');
const ROOT = path.join(__dirname, '..', '..');
const DB_PATH = path.resolve(process.env.DB_PATH || path.join(ROOT, 'data', 'mdtask.db'));
const SUMMARY = path.join(ROOT, 'content', 'SUMMARY.md');
const DIR = 'section-dom-podrobnaya-teoriya';
const SECTION = 'DOM: подробная теория';
const GROUP = 'WEB';
const DUE = '2026-11-30';
const PARTS = [
  ['chast-1-kak-brauzer-stroit-stranitsu', 'Теория DOM. Часть 1. Как браузер строит страницу'],
  ['chast-2-poisk-elementov-i-obhod-dereva', 'Теория DOM. Часть 2. Поиск элементов и обход дерева'],
  ['chast-3-soderzhimoe-atributy-klassy-i-stili', 'Теория DOM. Часть 3. Содержимое, атрибуты, классы и стили'],
  ['chast-4-sozdanie-i-izmenenie-elementov', 'Теория DOM. Часть 4. Создание, вставка и удаление элементов'],
  ['chast-5-sobytiya', 'Теория DOM. Часть 5. События'],
  ['chast-6-formy', 'Теория DOM. Часть 6. Формы'],
  ['chast-7-professionalnye-priemy', 'Теория DOM. Часть 7. Профессиональные приёмы'],
  ['chast-8-moduli-i-itogovyi-primer', 'Теория DOM. Часть 8. ES-модули и итоговый пример'],
].map(([slug, title]) => ({ title, mdPath: `${DIR}/${slug}.md` }));

const missingFiles = PARTS.filter((p) => !fs.existsSync(path.join(ROOT, 'content', 'src', p.mdPath)));
if (missingFiles.length) {
  console.error('Нет файлов:', missingFiles.map((p) => p.mdPath).join(', '));
  process.exit(1);
}

// SUMMARY.md: раздел перед «Проектирование ИС», а если его нет — перед «Мои доп. задания» или в конец.
let summary = fs.readFileSync(SUMMARY, 'utf-8');
const needSummary = !summary.includes(`(${DIR}/`);
if (needSummary) {
  const block = `- [${SECTION}]()\n` + PARTS.map((p) => `  - [${p.title}](${p.mdPath})\n`).join('');
  const anchor = ['- [Проектирование ИС: схемы процессов]()', '- [Мои доп. задания]()'].find((a) => summary.includes(a));
  summary = anchor ? summary.replace(anchor, block + anchor) : summary.replace(/\n*$/, '\n') + block;
}

const db = new Database(DB_PATH, { readonly: !APPLY });
const course = db.prepare("SELECT course_id FROM assignments WHERE target_group = ? AND md_path LIKE 'section-dom-rabota-s-document/%' LIMIT 1").get(GROUP);
const courseId = course ? course.course_id : 'course-1';
const have = new Set(db.prepare('SELECT md_path FROM assignments WHERE md_path LIKE ?').all(`${DIR}/%`).map((r) => r.md_path));
const toAdd = PARTS.filter((p) => !have.has(p.mdPath));

console.log(`База: ${DB_PATH}`);
console.log(`SUMMARY.md: ${needSummary ? 'добавить раздел' : 'раздел уже есть'}`);
console.log(`Задания: добавить ${toAdd.length}, уже есть ${PARTS.length - toAdd.length} (группа ${GROUP}, срок ${DUE}, курс ${courseId})`);
if (!APPLY) {
  console.log('\nЭто только отчёт. Выполнить: тот же вызов с --apply.');
  process.exit(0);
}

if (needSummary) fs.writeFileSync(SUMMARY, summary, 'utf-8');
const insert = db.prepare(
  'INSERT INTO assignments (id, course_id, title, md_path, target_type, target_student_id, target_group, due_date) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)'
);
db.transaction(() => {
  toAdd.forEach((p, i) => {
    const id = `assign-${Date.now() + i}-${Math.random().toString(36).slice(2, 8)}`;
    insert.run(id, courseId, p.title, p.mdPath, 'group', GROUP, DUE);
  });
})();
console.log('Готово. Перезапустите сервер, чтобы раздел появился в меню.');
