#!/usr/bin/env node
// Сброс пароля пользователя. Запускается НА СЕРВЕРЕ, в папке проекта (/root/mdtask).
// Перед изменением делает резервную копию БД в backups/. Новый пароль по умолчанию — общий (std-snrg).
//
//   DB_PATH=./data/mdtask.db node scripts/fixes/reset-password.js <ID> [НОВЫЙ_ПАРОЛЬ]
//   DB_PATH=./data/mdtask.db node scripts/fixes/reset-password.js st-ib-125
//   DB_PATH=./data/mdtask.db node scripts/fixes/reset-password.js st-ib-125 Novy-2026
//
// После сброса сообщите студенту логин (его ID) и новый пароль; он сможет сменить его на сайте.
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const db = require('../../src/db');
const { DEFAULT_PASSWORD, MIN_PASSWORD_LENGTH } = require('../../src/lib/password');

async function main(argv) {
  const id = argv[0];
  const newPassword = argv[1] || DEFAULT_PASSWORD;
  if (!id) throw new Error('укажите ID пользователя: node scripts/fixes/reset-password.js <ID> [пароль]');
  if (String(newPassword).length < MIN_PASSWORD_LENGTH) {
    throw new Error(`пароль слишком короткий (минимум ${MIN_PASSWORD_LENGTH} символов)`);
  }
  const user = db.getUserById(id);
  if (!user) throw new Error(`пользователь «${id}» не найден`);

  // резервная копия БД (консистентный снимок) перед изменением
  const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'mdtask.db');
  const backupsDir = path.join(path.dirname(dbPath), '..', 'backups');
  fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(backupsDir, `before-reset-password-${stamp}.db`);
  const src = new Database(dbPath, { readonly: true });
  await src.backup(dest);
  src.close();

  db.setUserPassword(id, newPassword);
  console.log(`Готово. Пользователь ${id} (${user.name || ''}, группа ${user.group || '—'}).`);
  console.log(`Логин: ${id}`);
  console.log(`Новый пароль: ${newPassword}`);
  console.log(`Резервная копия БД: ${dest}`);
  console.log('Сообщите эти данные студенту; он сможет сменить пароль на сайте в разделе «Сменить пароль».');
}

main(process.argv.slice(2)).catch((err) => {
  console.error(`Ошибка: ${err.message}`);
  process.exit(1);
});
