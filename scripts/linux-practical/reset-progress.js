#!/usr/bin/env node
// Сброс прогресса ТОЛЬКО практической работы «Терминал» (предмет Linux Terminal Trainer).
// Миссии тренажёра (ключи вида m1-1) НЕ трогаются — удаляются лишь ключи практической «pr:%»
// (шаги pr:<id> и журнал pr:log) из linux_progress и соответствующие строки linux_events.
// Запускается НА СЕРВЕРЕ, в папке проекта (/root/mdtask). Перед изменением делает резервную копию БД.
//
//   DB_PATH=./data/mdtask.db node scripts/linux-practical/reset-progress.js --dry      # только показать, что будет сброшено
//   DB_PATH=./data/mdtask.db node scripts/linux-practical/reset-progress.js            # сбросить у всех
//   DB_PATH=./data/mdtask.db node scripts/linux-practical/reset-progress.js --student stWeb-105   # сбросить у одного
//
// Сервер перезапускать не нужно: прогресс читается при каждом запросе, студенты увидят практическую заново.
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const LIKE = 'pr:%'; // префикс ключей практической

async function main(argv) {
  const dry = argv.includes('--dry');
  const si = argv.indexOf('--student');
  const student = si !== -1 ? argv[si + 1] : null;
  if (si !== -1 && !student) throw new Error('после --student укажите ID студента');

  const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'mdtask.db');
  if (!fs.existsSync(dbPath)) throw new Error(`БД не найдена: ${dbPath} (задайте DB_PATH)`);

  // где фильтр по студенту
  const where = (col) => `${col} LIKE ?${student ? ' AND student_id = ?' : ''}`;
  const params = student ? [LIKE, student] : [LIKE];

  // предпросмотр: сколько строк и студентов затронуто
  const ro = new Database(dbPath, { readonly: true });
  const progRows = ro.prepare(`SELECT COUNT(*) n FROM linux_progress WHERE ${where('item_id')}`).get(...params).n;
  const evtRows = ro.prepare(`SELECT COUNT(*) n FROM linux_events WHERE ${where('item_id')}`).get(...params).n;
  const students = ro.prepare(
    `SELECT DISTINCT student_id FROM linux_progress WHERE ${where('item_id')} ORDER BY student_id`
  ).all(...params).map((r) => r.student_id);
  ro.close();

  console.log(`Практическая «Терминал» — к сбросу:`);
  console.log(`  студентов: ${students.length}${students.length ? ` (${students.join(', ')})` : ''}`);
  console.log(`  строк прогресса (linux_progress, pr:%): ${progRows}`);
  console.log(`  строк событий (linux_events, pr:%): ${evtRows}`);
  if (student) console.log(`  фильтр по студенту: ${student}`);

  if (progRows === 0 && evtRows === 0) {
    console.log('Нечего сбрасывать — прогресс практической пуст.');
    return;
  }
  if (dry) {
    console.log('\n[--dry] Ничего не изменено. Уберите --dry, чтобы выполнить сброс.');
    return;
  }

  // резервная копия БД (консистентный снимок) перед изменением
  const backupsDir = path.join(path.dirname(dbPath), '..', 'backups');
  fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(backupsDir, `before-reset-linux-practical-${stamp}.db`);
  const src = new Database(dbPath, { readonly: true });
  await src.backup(dest);
  src.close();

  // удаление только практических ключей
  const w = new Database(dbPath);
  const run = w.transaction(() => {
    const p = w.prepare(`DELETE FROM linux_progress WHERE ${where('item_id')}`).run(...params);
    const e = w.prepare(`DELETE FROM linux_events WHERE ${where('item_id')}`).run(...params);
    return { prog: p.changes, evt: e.changes };
  });
  const res = run();
  w.close();

  console.log(`\nГотово. Удалено: прогресс ${res.prog}, события ${res.evt}.`);
  console.log(`Резервная копия БД: ${dest}`);
  console.log('Миссии тренажёра не затронуты. Перезапуск сервера не требуется.');
}

main(process.argv.slice(2)).catch((err) => {
  console.error(`Ошибка: ${err.message}`);
  process.exit(1);
});
