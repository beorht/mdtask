// Выдаёт персональное задание «Каталог на XML и DOM» студентам группы web-2.
// Каждому — свой вариант (generate.js): текст с его темой/ограничением/маркёром, сдача архивом
// (upload_types по умолчанию = .zip/.rar). Задание индивидуальное, у видящих курс JS попадает в
// урок «dom-project» модуля 6 (правило в content/js-course/assignments.json).
// Памятки учителю пишутся в data/teacher/web-dom-xml/<student>.md.
//
// Два режима времени:
//   --date ГГГГ-ММ-ДД  — жёсткое окно 09:00–14:00 (+05) в этот день (как на контрольной);
//   --due  ГГГГ-ММ-ДД  — обычное задание со сдачей до этой даты (без окна).
// Часы окна можно переопределить: --open 9 --close 14.
//
//   DB_PATH=./data/mdtask.db node scripts/web-dom-xml/issue.js --date 2026-11-17 --group web-2
//   DB_PATH=./data/mdtask.db node scripts/web-dom-xml/issue.js --due 2026-11-17 stWeb-001 stWeb-002
//
// Студент, у которого уже есть задание с этим заголовком, пропускается.
const fs = require('fs');
const path = require('path');
const db = require('../../src/db');
const { createAssignmentWithContent } = require('../../src/lib/assignment-content');
const { windowFromDate } = require('../../src/lib/assignment-window');
const { variantFor, statement, teacherSheet } = require('./generate');

const TITLE = 'Каталог на XML и DOM (двухстраничный сайт)';
const COURSE_ID = 'course-1';
const TEACHER_DIR = path.join(__dirname, '..', '..', 'data', 'teacher', 'web-dom-xml');
// Два отдельных поля загрузки в одной сдаче: код (архив сайта) и отдельно схема (XSD).
const UPLOAD_SLOTS = [
  { label: 'Код сайта (архив)', accept: ['.zip', '.rar'] },
  { label: 'Схема XSD (schema.xsd)', accept: ['.xsd', '.xml'] },
];

function optVal(argv, name) {
  const i = argv.indexOf(name);
  return { index: i, value: i !== -1 ? argv[i + 1] : null };
}

function main(argv) {
  const date = optVal(argv, '--date');
  const due = optVal(argv, '--due');
  const dateStr = date.value || due.value;
  if ((date.index === -1) === (due.index === -1) || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) {
    throw new Error('укажите ровно одно: --date ГГГГ-ММ-ДД (жёсткое окно 09:00–14:00) или --due ГГГГ-ММ-ДД (без окна)');
  }
  const dueDate = dateStr; // срок = тот же день
  const openH = Number(optVal(argv, '--open').value || 9);
  const closeH = Number(optVal(argv, '--close').value || 14);
  const win = date.index !== -1 ? windowFromDate(dateStr, openH, closeH) : null;

  const groupOpt = optVal(argv, '--group');
  const group = groupOpt.value;
  const used = new Set();
  for (const o of [date, due, groupOpt, optVal(argv, '--open'), optVal(argv, '--close')]) {
    if (o.index !== -1) { used.add(o.index); used.add(o.index + 1); }
  }

  const users = db.getUsers();
  let students = argv.filter((a, i) => !used.has(i));
  if (group) {
    students = users.filter((u) => u.role === 'student' && u.group === group).map((u) => u.id);
    if (!students.length) throw new Error(`в группе ${group} нет студентов`);
  }
  if (!students.length) throw new Error('укажите ID студентов или --group');

  const byId = new Map(users.map((u) => [u.id, u]));
  const existing = db.getAssignments();
  fs.mkdirSync(TEACHER_DIR, { recursive: true });

  for (const studentId of students) {
    const user = byId.get(studentId);
    if (!user || user.role !== 'student') throw new Error(`нет студента ${studentId}`);
    if (existing.some((a) => a.targetStudentId === studentId && a.title === TITLE)) {
      console.log(`${studentId}: уже выдано, пропускаю`);
      continue;
    }
    const v = variantFor(studentId, user.name, user.login || studentId);
    const assignment = createAssignmentWithContent(
      COURSE_ID,
      { title: TITLE, dueDate, targetType: 'individual', targetStudentId: studentId },
      statement(v)
    );
    // Два поля загрузки: код + отдельно схема. subject оставляем NULL (DOM — часть предмета
    // JavaScript, показ в курсе задаёт mapping по пути Markdown).
    db.setAssignmentUploadSlots(assignment.id, UPLOAD_SLOTS);
    if (win) db.setAssignmentWindow(assignment.id, win);
    fs.writeFileSync(path.join(TEACHER_DIR, `${studentId}.md`), teacherSheet(v), 'utf-8');
    const when = win ? `окно ${dateStr} ${openH}:00–${closeH}:00 (+05)` : `срок ${dueDate}`;
    console.log(`${studentId} (${user.name}): выдано ${assignment.id}, тема «${v.theme.catalog}», ${when}`);
  }
}

try {
  main(process.argv.slice(2));
} catch (err) {
  console.error(`Ошибка: ${err.message}`);
  process.exit(1);
}
