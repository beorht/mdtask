// Новая группа web-1 (27.10.2026): 16 студентов со стандартным паролем (DEFAULT_PASSWORD), при первом входе — смена
// пароля. Доступ к предмету «Web-разработка: HTML» даёт HTML_GROUPS в src/lib/html-course/index.js.
// Сначала копия базы в backups/. Повторный запуск ничего не меняет (существующие аккаунты не трогаются).
//   node scripts/fixes/2026-10-27-add-web-1.js [путь к базе, по умолчанию data/mdtask.db]
const path = require('path');
const Database = require('better-sqlite3');
const { DEFAULT_PASSWORD, hashPassword } = require('../../src/lib/password');

const GROUP = 'web-1';
const STUDENTS = [
  ['stWeb-203', 'Олимова Сокина'],
  ['stWeb-139', 'Миралиева Мухлиса'],
  ['stWeb-014', 'Витман Полина'],
  ['stWeb-799', 'Муйджанова Мохина'],
  ['stWeb-740', 'Абдулаханова Мохира'],
  ['stWeb-594', 'Солиханова Робия'],
  ['stWeb-624', 'Машрабжанов Огабек'],
  ['stWeb-983', 'Абдукодиров Абдулхамид'],
  ['stWeb-400', 'Садриддинов Аббосхон'],
  ['stWeb-542', 'Мирзаазимов Самандар'],
  ['stWeb-091', 'Ёкубжанов Мираббос'],
  ['stWeb-729', 'Мажиддов Музаффар'],
  ['stWeb-097', 'Лутфиддинов Азизбек'],
  ['stWeb-215', 'Тоштемиров Самандар'],
  ['stWeb-461', 'Турсунов Мухаммаджон'],
  ['stWeb-357', 'Абдумалликов Ойаттулло'],
];

const dbPath = process.argv[2] || process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'mdtask.db');
const db = new Database(dbPath, { fileMustExist: true });
const backup = path.join(path.dirname(dbPath), '..', 'backups', `mdtask-before-add-web-1-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);

db.backup(backup).then(() => {
  console.log(`Копия базы: ${backup}`);
  const insert = db.prepare(
    "INSERT OR IGNORE INTO users (id, role, name, student_group, password_hash, password_salt, must_change_password) VALUES (?, 'student', ?, ?, ?, ?, 1)"
  );
  let added = 0;
  db.transaction(() => {
    for (const [id, name] of STUDENTS) {
      const { hash, salt } = hashPassword(DEFAULT_PASSWORD);
      const r = insert.run(id, name, GROUP, hash, salt);
      added += r.changes;
      console.log(`  ${id} ${name}: ${r.changes ? 'создан' : 'уже есть'}`);
    }
  })();
  console.log(`Группа ${GROUP}: добавлено ${added} из ${STUDENTS.length}.`);
});
