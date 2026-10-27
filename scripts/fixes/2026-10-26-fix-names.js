// Разовая правка базы (26.10.2026), для рабочего сервера; в локальной базе уже выполнена.
//   1. Имена файлов сданных работ, сохранённые в latin1 до исправления multer («ÐÐ°Ð´Ð°ÑÐ°…» → «Задача…»):
//      перекодируется только submissions.files; файлы на диске (stored_files) не трогаются.
//   2. Имя st-ib-472: кириллическая «н» вместо латинской «h».
// Сначала копия базы в backups/. Повторный запуск ничего не меняет.
//   node scripts/fixes/2026-10-26-fix-names.js [путь к базе, по умолчанию data/mdtask.db]
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.argv[2] || process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'mdtask.db');
const db = new Database(dbPath, { fileMustExist: true });
const backup = path.join(path.dirname(dbPath), '..', 'backups', `mdtask-before-fix-names-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);

db.backup(backup).then(() => {
  console.log(`Копия базы: ${backup}`);
  const broken = (name) => /[ÐÑ]/.test(name);
  const rows = db.prepare('SELECT id, files FROM submissions').all().filter((r) => broken(r.files));
  const update = db.prepare('UPDATE submissions SET files = ? WHERE id = ?');
  db.transaction(() => {
    for (const row of rows) {
      const files = JSON.parse(row.files).map((f) => (broken(f) ? Buffer.from(f, 'latin1').toString('utf8') : f));
      update.run(JSON.stringify(files), row.id);
      console.log(`  ${row.id}: ${files.join(' | ')}`);
    }
    const name = db.prepare('UPDATE users SET name = ? WHERE id = ? AND name = ?')
      .run('Tursunbayeva Shaxrina Baxtiyorovna', 'st-ib-472', 'Tursunbayeva Sнaxrina Baxtiyorovna');
    console.log(`Имена файлов исправлены в ${rows.length} работах; имя st-ib-472: ${name.changes ? 'исправлено' : 'уже верное или нет такого'}.`);
  })();
});
