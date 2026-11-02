// Отметить задание предмета «Web-разработка: HTML» решённым у студента — например, если задание не
// засчиталось из-за прежнего бага проверки (символы «—», «©» и т.п.). Перед правкой делает бэкап БД.
//
// Использование (из каталога проекта):
//   node scripts/fixes/mark-html-task-solved.js ID_СТУДЕНТА id_задания
//   DB=/root/mdtask/data/mdtask.db node scripts/fixes/mark-html-task-solved.js st-web-982 text-07
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB = process.env.DB || path.join(process.cwd(), 'data', 'mdtask.db');
const [, , student, item] = process.argv;
if (!student || !item) {
  console.error('Использование: node scripts/fixes/mark-html-task-solved.js ID_СТУДЕНТА id_задания');
  process.exit(2);
}
if (!fs.existsSync(DB)) { console.error('Нет файла БД:', DB); process.exit(1); }

fs.mkdirSync(path.join(path.dirname(DB), '..', 'backups'), { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = path.join(path.dirname(DB), '..', 'backups', `mdtask-before-mark-${stamp}.db`);
fs.copyFileSync(DB, backup);
console.log('Бэкап БД:', backup);

const db = new Database(DB);
const now = new Date().toISOString();
const row = db.prepare('SELECT stats FROM html_progress WHERE student_id=? AND item_id=?').get(student, item);
let stats = row ? JSON.parse(row.stats) : { attempts: 0 };
if (stats.solvedAt) { console.log(`Уже отмечено решённым: ${stats.solvedAt}`); process.exit(0); }

stats.solvedAt = now;
stats.lastStatus = 'success';
stats.attemptsToSolve = stats.attemptsToSolve || stats.attempts || null;
stats.solvedCode = stats.solvedCode || stats.lastCode || '';

if (row) {
  db.prepare('UPDATE html_progress SET solved_at=?, stats=?, updated_at=? WHERE student_id=? AND item_id=?')
    .run(now, JSON.stringify(stats), now, student, item);
} else {
  db.prepare('INSERT INTO html_progress (student_id, item_id, stats, solved_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .run(student, item, JSON.stringify(stats), now, now);
}
console.log(`Готово: задание «${item}» у ${student} отмечено решённым (${now}).`);
