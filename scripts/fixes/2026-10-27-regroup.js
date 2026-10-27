// Разделение групп (27.10.2026): студенты с логином вида «xx-ib-NNN» → группа ib-2, «xx-web-NNN» → группа web-2.
// Логины и пароли не меняются. Задания, адресованные группам IB / WEB, и закрытия занятий Emmet переходят на новые
// группы, только если в старой группе никого не осталось (иначе — предупреждение, ничего не переносится).
// Контрольные IB и WEB в коде уже ждут группы ib-2 и web-2 (src/lib/exam/index.js, src/lib/web-exam/index.js).
// Сначала копия базы в backups/. Повторный запуск ничего не меняет.
//   node scripts/fixes/2026-10-27-regroup.js [путь к базе, по умолчанию data/mdtask.db]
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const MOVES = [
  { from: 'IB', to: 'ib-2', re: /^[A-Za-z]{2}-ib-\d{3}$/ },
  { from: 'WEB', to: 'web-2', re: /^[A-Za-z]{2}-web-\d{3}$/ },
];

const dbPath = process.argv[2] || process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'mdtask.db');
const db = new Database(dbPath, { fileMustExist: true });
const backupDir = path.join(path.dirname(dbPath), '..', 'backups');
fs.mkdirSync(backupDir, { recursive: true });
const backup = path.join(backupDir, `mdtask-before-regroup-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);

db.backup(backup).then(() => {
  console.log(`Копия базы: ${backup}`);
  const students = db.prepare("SELECT id, name, student_group FROM users WHERE role = 'student'").all();
  const setGroup = db.prepare('UPDATE users SET student_group = ? WHERE id = ?');
  db.transaction(() => {
    for (const move of MOVES) {
      const moved = students.filter((u) => move.re.test(u.id) && u.student_group !== move.to);
      for (const u of moved) setGroup.run(move.to, u.id);
      const total = db.prepare('SELECT COUNT(*) AS n FROM users WHERE student_group = ?').get(move.to).n;
      console.log(`${move.to}: перенесено ${moved.length} (было в группах: ${[...new Set(moved.map((u) => u.student_group))].join(', ') || '—'}), всего в группе ${total}.`);

      const left = db.prepare("SELECT id, name FROM users WHERE role = 'student' AND student_group = ?").all(move.from);
      if (left.length) {
        console.log(`  ВНИМАНИЕ: в группе ${move.from} остались ${left.length} (логин не по образцу): ${left.map((u) => u.id).join(', ')}.`);
        console.log(`  Задания группы ${move.from} не переносятся — решите вручную.`);
        continue;
      }
      const a = db.prepare('UPDATE assignments SET target_group = ? WHERE target_group = ?').run(move.to, move.from);
      const s = db.prepare('UPDATE OR IGNORE emmet_sessions SET student_group = ? WHERE student_group = ?').run(move.to, move.from);
      console.log(`  задания группы ${move.from} → ${move.to}: ${a.changes}; занятия Emmet: ${s.changes}.`);
    }
  })();
  const groups = db.prepare("SELECT student_group AS g, COUNT(*) AS n FROM users WHERE role = 'student' GROUP BY 1 ORDER BY 1").all();
  console.log('Группы сейчас: ' + groups.map((r) => `${r.g} ${r.n}`).join(', '));
});
