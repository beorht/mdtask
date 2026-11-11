#!/usr/bin/env node
// Создаёт групповое задание «Анализатор журналов сервера на SQLite» для группы ib-2 (предмет Python,
// онлайн-редактор Pyodide: файл main.py, sqlite3 в браузере, проверка преподавателем).
// Текст задания уже лежит в репозитории (content/src/section-python-analiz-dannyh/…md) и попадает
// в предмет Python через правило в content/python-course/assignments.json. Скрипт только создаёт
// строку задания в БД и включает режим редактора. Идемпотентен: повторный запуск не плодит копии.
//
//   DB_PATH=./data/mdtask.db node scripts/python-logdb/issue.js                 # группа ib-2, срок по умолчанию
//   DB_PATH=./data/mdtask.db node scripts/python-logdb/issue.js --due 2026-12-20
//   DB_PATH=./data/mdtask.db node scripts/python-logdb/issue.js --group ib-2 --due 2026-12-20
const db = require('../../src/db');

const TITLE = 'Анализатор журналов сервера на SQLite';
const MD_PATH = 'section-python-analiz-dannyh/analizator-zhurnalov-servera-na-sqlite.md';
const COURSE_ID = 'course-1';
const CODE_FILES = ['main.py']; // задание-редактор: один файл, без стартового кода

function optVal(argv, name, def = null) {
  const i = argv.indexOf(name);
  return i !== -1 ? argv[i + 1] : def;
}

function main(argv) {
  const group = optVal(argv, '--group', 'ib-2');
  const dueDate = optVal(argv, '--due', '2026-12-31');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error('--due ГГГГ-ММ-ДД');

  const students = db.getUsers().filter((u) => u.role === 'student' && u.group === group);
  if (!students.length) throw new Error(`в группе ${group} нет студентов`);

  const existing = db.getAssignments().find((a) => a.title === TITLE && a.targetGroup === group);
  if (existing) {
    // убедимся, что режим редактора включён, и выходим
    db.setAssignmentCodeFiles(existing.id, CODE_FILES);
    console.log(`Уже создано (${existing.id}) для группы ${group}. Режим редактора подтверждён, срок ${existing.dueDate || '—'}.`);
    return;
  }

  const a = db.createAssignment({
    courseId: COURSE_ID,
    title: TITLE,
    mdPath: MD_PATH,
    targetType: 'group',
    targetGroup: group,
    dueDate,
  });
  db.setAssignmentCodeFiles(a.id, CODE_FILES); // онлайн-редактор main.py (архив отключён)

  console.log(`Готово. Задание ${a.id} «${TITLE}» выдано группе ${group} (студентов: ${students.length}), срок ${dueDate}.`);
  console.log('Сдача: онлайн-редактор main.py (sqlite3 в браузере), проверяет преподаватель на /admin.');
}

try {
  main(process.argv.slice(2));
} catch (err) {
  console.error(`Ошибка: ${err.message}`);
  process.exit(1);
}
